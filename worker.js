// --- CONFIGURATION ---
const CONFIG = {
  // 1. REPLACE THIS with your R2 Public Bucket URL or Custom Domain
  R2_PUBLIC_URL: "https://pub-c8af0fd55b6347e8a948441a6a4dd059.r2.dev", 
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  RATE_LIMIT_HITS: 20,
  EXPIRY_MS: 1 * 60 * 60 * 1000,
};

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return handleOptions();

    try {
      if (url.pathname === "/api/init-session") {
        const secret = await env.JWT_SECRET.get();
        return await initSession(secret);
      }

      if (url.pathname === "/api/create-file") {
        return await withAuth(req, env, ctx, createFile);
      }

      // NOTE: getFile is now technically redundant if you use the Public URL,
      // but keeping it here for fallback/private access.
      if (url.pathname.startsWith("/api/file/")) {
        return await getFile(req, env);
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      return error(err.message, err.status || 500);
    }
  }
};

/* -------------------- AUTH & RATE LIMITING -------------------- */

async function withAuth(req, env, ctx, handler) {
  const token = req.headers.get("x-session-token");
  if (!token) throw { message: "Missing session token", status: 401 };

  const secret = await env.JWT_SECRET.get();
  const payload = await verifyJWT(token, secret);
  if (!payload) throw { message: "Invalid or expired session", status: 403 };

  const ip = req.headers.get("CF-Connecting-IP") || "anonymous";
  await checkRateLimit(ip, ctx);

  return handler(req, env);
}

async function checkRateLimit(ip, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(`https://ratelimit.local/ip/${ip}`);
  
  let cachedRes = await cache.match(cacheKey);
  let count = cachedRes ? parseInt(await cachedRes.text()) : 0;

  if (count >= CONFIG.RATE_LIMIT_HITS) {
    throw { message: "Rate limit reached.", status: 429 };
  }

  const response = new Response((count + 1).toString(), {
    headers: { "Cache-Control": "max-age=3600" } 
  });
  
  ctx.waitUntil(cache.put(cacheKey, response));
}

/* -------------------- CORE HANDLERS -------------------- */

async function initSession(secret) {
  const now = Math.floor(Date.now() / 1000);
  const token = await createJWT({ iat: now, exp: now + 86400 }, secret);
  return json({ 
    token,
    config: {
      maxFileSize: CONFIG.MAX_FILE_SIZE,
      maxFileSizeMB: Math.round(CONFIG.MAX_FILE_SIZE / (1024 * 1024) * 10) / 10,
      expiryHours: CONFIG.EXPIRY_MS / (60 * 60 * 1000)
    }
  });
}

async function createFile(req, env) {
  if (req.method !== "POST") throw { message: "Method not allowed", status: 405 };

  const contentLength = Number(req.headers.get("Content-Length"));
  if (contentLength > CONFIG.MAX_FILE_SIZE) throw { message: "File too large", status: 413 };

  const contentType = req.headers.get("Content-Type") || "application/octet-stream";
  const fileId = crypto.randomUUID();
  const content = await req.arrayBuffer();
  
  const objectKey = `temp/${fileId}`;

  // Calculate expiry
  const expiryTimestamp = Date.now() + CONFIG.EXPIRY_MS;

  await env.R2.put(objectKey, content, {
    httpMetadata: { contentType },
    customMetadata: { expires: expiryTimestamp.toString() }
  });

  const publicUrl = `${CONFIG.R2_PUBLIC_URL}/${objectKey}`;

  return json({ 
    id: fileId, 
    url: publicUrl,
    expires_at: expiryTimestamp,
    expires_at_iso: new Date(expiryTimestamp).toISOString()
  });
}

async function getFile(req, env) {
  const id = req.url.split("/").pop();
  const file = await env.R2.get(`temp/${id}`);

  if (!file) return error("File not found", 404);

  const expires = Number(file.customMetadata.expires);
  if (expires && Date.now() > expires) {
    return error("File expired", 410);
  }

  return new Response(file.body, {
    headers: {
      "Content-Type": file.httpMetadata.contentType || "application/octet-stream",
      "Content-Security-Policy": "default-src 'none'; sandbox;", 
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
      // Added Expiry Header
      "X-File-Expires": expires ? new Date(expires).toISOString() : "never"
    }
  });
}

/* -------------------- CRYPTO HELPERS -------------------- */

async function createJWT(payload, secret) {
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const data = b64(JSON.stringify(payload));
  const signature = await hmac(`${header}.${data}`, secret);
  return `${header}.${data}.${signature}`;
}

async function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, data, sig] = parts;
  const expectedSig = await hmac(`${header}.${data}`, secret);
  if (sig !== expectedSig) return null;
  const payload = JSON.parse(atob(data.replace(/-/g, '+').replace(/_/g, '/')));
  return payload;
}

async function hmac(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return b64_raw(sig);
}

function b64(str) { return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
function b64_raw(bin) { return btoa(String.fromCharCode(...new Uint8Array(bin))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
function json(d) { return new Response(JSON.stringify(d), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }); }
function error(m, s) { return new Response(JSON.stringify({ error: m }), { status: s, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }); }
function handleOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-session-token",
    }
  });
}
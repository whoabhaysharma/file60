import { CONFIG, b64, b64_raw } from './utils.js';

export async function withAuth(req, env, ctx, handler) {
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

export async function createJWT(payload, secret) {
    const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const data = b64(JSON.stringify(payload));
    const signature = await hmac(`${header}.${data}`, secret);
    return `${header}.${data}.${signature}`;
}

export async function verifyJWT(token, secret) {
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

import * as BunnySDK from "@bunny.net/edgescript-sdk";
import * as BunnyStorageSDK from "@bunny.net/storage-sdk";
import { SignJWT, jwtVerify } from "jose";

type RuntimeConfig = {
  jwtSecret: string;
  maxFileSize: number;
  publicUrl: string;
  storageZone: string;
  storageAccessKey: string;
  storageRegion: BunnyStorageSDK.regions.StorageRegion;
};
type FileRecord = {
  id: string;
  objectPath: string;
  contentType: string;
  createdAtSeconds: number;
  expiresAtSeconds: number;
  extendedOnce: boolean;
};
const MAX_FILE_SIZE_HARD_LIMIT = 100 * 1024 * 1024; // 100MB server-enforced cap
const localFiles = new Map<string, FileRecord>();



/** Local Deno: read repo-root `.env` / `.dev.vars` into Deno.env (shell `source .env` often breaks on JWTs). Skips Bunny Edge (`Deno.mainModule` is `ext:main.ts`, not a `file:` URL). */
async function loadDotEnvFilesIntoDenoEnv(): Promise<void> {
  try {
    const deno = (globalThis as any).Deno;
    if (!deno?.readTextFile || !deno?.env?.get || !deno?.env?.set) return;

    const moduleUrl = typeof deno.mainModule === "string" ? deno.mainModule : "";
    // Bunny Edge exposes Deno-like globals with mainModule `ext:main.ts` — no filesystem repo; use dashboard env only.
    if (!moduleUrl || !moduleUrl.startsWith("file:")) return;

    let repoRoot: URL;
    try {
      repoRoot = new URL("../", moduleUrl);
    } catch {
      return;
    }

    function parseAndApply(text: string) {
      for (let line of text.split("\n")) {
        line = line.replace(/\r$/, "").trim();
        if (!line || line.startsWith("#")) continue;
        if (line.startsWith("export ")) line = line.slice(7).trim();
        const eq = line.indexOf("=");
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
        let value = line.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        const cur = deno.env.get(key);
        if (cur === undefined || String(cur).trim() === "") deno.env.set(key, value);
      }
    }

    for (const name of [".env", ".dev.vars"]) {
      try {
        const fileUrl = new URL(name, repoRoot);
        const text = await deno.readTextFile(fileUrl);
        parseAndApply(text);
      } catch {
        // file missing
      }
    }
  } catch {
    // never fail requests if dotenv resolution breaks
  }
}

let dotEnvLoadPromise: Promise<void> | null = null;
function ensureDotEnvLoaded(): Promise<void> {
  if (!dotEnvLoadPromise) dotEnvLoadPromise = loadDotEnvFilesIntoDenoEnv();
  return dotEnvLoadPromise;
}

function env(key: string, fallback = ""): string {
  // Deno local dev (npm run dev:bunny-edge)
  const denoRuntime = (globalThis as any).Deno;
  const denoValue = denoRuntime?.env?.get?.(key);
  if (denoValue && String(denoValue).trim()) return String(denoValue).trim();
  // Bunny Edge: credentials from "Add Secrets to Edge Script" are often exposed here first
  const bunnyRuntimeEnv = (globalThis as any).Bunny?.environment;
  const bunnyValue = bunnyRuntimeEnv?.get?.(key);
  if (bunnyValue != null && String(bunnyValue).trim()) return String(bunnyValue).trim();
  // Bunny Edge / Node-style dashboard variables
  if (typeof process !== "undefined" && process.env?.[key] !== undefined) {
    const p = String(process.env[key]).trim();
    if (p) return p;
  }
  return fallback;
}

/** Detect runtime environment: bunny-edge, deno-local, or unknown. */
function detectRuntime(): "bunny-edge" | "deno-local" | "unknown" {
  const deno = (globalThis as any).Deno;
  if (!deno) return "unknown";
  const mainModule = typeof deno.mainModule === "string" ? deno.mainModule : "";
  if (mainModule.startsWith("ext:")) return "bunny-edge";
  if (mainModule.startsWith("file:")) return "deno-local";
  return "unknown";
}

function getAllowedCorsOrigins(): string[] {
  const raw = env("CORS_ORIGIN", "").trim();
  if (!raw) return [];
  if (raw === "*") return ["*"];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin: string, allowEntry: string): boolean {
  if (allowEntry === "*") return true;
  if (allowEntry === origin) return true;
  // Support wildcard subdomains like https://*.example.com
  if (allowEntry.includes("*.")) {
    const expected = allowEntry.replace("*.", "");
    return origin.endsWith(expected);
  }
  return false;
}

function resolveCorsOrigin(request: Request): string {
  const requestOrigin = request.headers.get("Origin");
  const allowlist = getAllowedCorsOrigins();
  if (!requestOrigin) return allowlist[0] || "*";
  // If CORS_ORIGIN is not configured, default to request origin for easier setup.
  if (!allowlist.length) return requestOrigin;
  return allowlist.some((entry) => isOriginAllowed(requestOrigin, entry)) ? requestOrigin : "null";
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = resolveCorsOrigin(request);
  const allowCredentials = origin !== "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": allowCredentials ? "true" : "false",
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-session-token, x-turnstile-token, x-ad-gate-token, X-File-Name, X-File-Size, X-File-Type, Cookie"
  };
}

function json(request: Request, data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(request),
      ...extraHeaders
    }
  });
}

function badRequest(request: Request, message: string) {
  return json(request, { error: message }, 400);
}

function getStorageRegion(raw: string) {
  const value = raw.trim();
  const aliasMap: Record<string, keyof typeof BunnyStorageSDK.regions.StorageRegion> = {
    de: "Falkenstein",
    uk: "London",
    ny: "NewYork",
    la: "LosAngeles",
    sg: "Singapore",
    se: "Stockholm",
    br: "SaoPaulo",
    jh: "Johannesburg",
    syd: "Sydney"
  };
  const normalized = aliasMap[value.toLowerCase()] || (value as keyof typeof BunnyStorageSDK.regions.StorageRegion);
  const region = BunnyStorageSDK.regions.StorageRegion[normalized];
  if (!region) throw new Error(`Unsupported Bunny storage region: ${raw}`);
  return region;
}

function getConfig(): RuntimeConfig {
  const jwtSecret = env("JWT_SECRET", "dev-local-jwt-secret");
  const configuredMaxFileSize = Number.parseInt(env("MAX_FILE_SIZE", `${MAX_FILE_SIZE_HARD_LIMIT}`), 10);
  const maxFileSize = Math.min(
    Number.isFinite(configuredMaxFileSize) ? configuredMaxFileSize : MAX_FILE_SIZE_HARD_LIMIT,
    MAX_FILE_SIZE_HARD_LIMIT
  );
  const publicUrl = env("BUNNY_PUBLIC_URL", "https://cdn-file60.bythub.in").trim();
  const storageZone = env("BUNNY_STORAGE_ZONE");
  const storageAccessKey = env("BUNNY_STORAGE_ACCESS_KEY");
  const storageRegion = getStorageRegion(env("BUNNY_STORAGE_REGION", "Falkenstein"));

  if (!jwtSecret) throw new Error("Missing JWT_SECRET");
  if (!storageZone || !storageAccessKey) {
    throw new Error("Missing Bunny storage credentials (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_ACCESS_KEY)");
  }
  if (!publicUrl) throw new Error("Missing BUNNY_PUBLIC_URL (set it or rely on default CDN host)");
  return {
    jwtSecret,
    maxFileSize,
    publicUrl,
    storageZone,
    storageAccessKey,
    storageRegion
  };
}

function getStorageZone(config: RuntimeConfig) {
  return BunnyStorageSDK.zone.connect_with_accesskey(
    config.storageRegion,
    config.storageZone,
    config.storageAccessKey
  );
}

/** PUT bytes to Bunny Storage without a streaming body (avoids `duplex: "half"` on fetch, which breaks on Bunny Edge). */
async function uploadStreamToBunnyStorage(
  storageZone: ReturnType<typeof getStorageZone>,
  objectPath: string,
  body: ReadableStream | ArrayBuffer | Uint8Array,
  contentType: string,
  contentLength: number
) {
  const url = BunnyStorageSDK.zone.addr(storageZone);
  url.pathname = `${url.pathname}${objectPath}`;
  const [authHeader, accessKey] = BunnyStorageSDK.zone.key(storageZone);
  const headers: Record<string, string> = {
    [authHeader]: accessKey,
    "Content-Type": "application/octet-stream",
    "Content-Length": contentLength.toString()
  };
  if (contentType) headers["Override-Content-Type"] = contentType;

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: body as any,
    // @ts-ignore - needed for streaming bodies in most fetch implementations
    duplex: "half"
  });

  if (!response.ok) {
    const zoneName = BunnyStorageSDK.zone.name(storageZone);
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new Error(`Storage upload failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
}

async function createToken(secret: string) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ iat: now, exp: now + 86400 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(new TextEncoder().encode(secret));
}

async function verifyToken(token: string, secret: string) {
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) acc[name] = rest.join("=");
    return acc;
  }, {} as Record<string, string>);
}

async function authenticate(request: Request, config: RuntimeConfig) {
  const headerToken = request.headers.get("x-session-token");
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = headerToken || cookies.file60_session;
  if (!token) return false;
  return await verifyToken(token, config.jwtSecret);
}

function sanitizeFilename(rawName: string): string {
  let safeName = rawName.replace(/[^a-zA-Z0-9.\-\s_()]/g, "_").replace(/\s+/g, "_");
  if (safeName.length > 100) safeName = safeName.slice(0, 100);
  if (!safeName || safeName === "." || safeName === "..") safeName = "file.bin";
  return safeName;
}

function buildSessionCookie(token: string, request: Request): string {
  const isHttps = new URL(request.url).protocol === "https:";
  // Secure is required for reliable cookie storage on HTTPS; omit on http:// local dev.
  const secureAttr = isHttps ? "; Secure" : "";
  return `file60_session=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${secureAttr}`;
}

async function handleCreateSession(request: Request, config: RuntimeConfig) {
  const token = await createToken(config.jwtSecret);
  const cookie = buildSessionCookie(token, request);
  return json(
    request,
    {
      session_token: token,
      config: {
        maxFileSize: config.maxFileSize,
        maxFileSizeMB: Math.round((config.maxFileSize / (1024 * 1024)) * 10) / 10,
        expiryHours: 1
      }
    },
    200,
    { "Set-Cookie": cookie }
  );
}



function getLocalFile(fileId: string) {
  const record = localFiles.get(fileId);
  if (!record) return null;
  if (record.expiresAtSeconds * 1000 < Date.now()) {
    localFiles.delete(fileId);
    return null;
  }
  return record;
}

async function handleCreateFile(request: Request, config: RuntimeConfig) {
  const isAuthenticated = await authenticate(request, config);
  if (!isAuthenticated) return json(request, { error: "Invalid or missing session" }, 401);

  const contentType = request.headers.get("X-File-Type") || request.headers.get("Content-Type") || "application/octet-stream";
  const encodedName = request.headers.get("X-File-Name");
  let rawName = "file.bin";
  if (encodedName) {
    try {
      rawName = decodeURIComponent(encodedName);
    } catch {
      return badRequest(request, "Invalid file name encoding");
    }
  }
  const safeName = sanitizeFilename(rawName);
  const shortId = crypto.randomUUID().slice(0, 8);
  const publicId = `${shortId}-${safeName}`;
  const objectPath = `/temp/${publicId}`;
  if (!request.body) return badRequest(request, "Missing file body");
  const claimedFileSize = Number(request.headers.get("X-File-Size") || request.headers.get("Content-Length") || "0");
  if (!Number.isFinite(claimedFileSize) || claimedFileSize <= 0) return badRequest(request, "Missing or invalid file size");
  if (claimedFileSize > config.maxFileSize) return json(request, { error: "File too large" }, 413);

  const storageZone = getStorageZone(config);
  try {
    // Ensure /temp exists as a directory
    await BunnyStorageSDK.file.createDirectory(storageZone, "/temp").catch(() => { });
    
    // Pipe the request body stream directly to Bunny Storage
    await uploadStreamToBunnyStorage(storageZone, objectPath, request.body, contentType, claimedFileSize);

    const verifyList = env("VERIFY_STORAGE_LIST", "");
    if (verifyList === "1" || verifyList.toLowerCase() === "true") {
      await assertObjectListedUnderTemp(storageZone, publicId);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Storage upload failed";
    return json(request, { error: msg, step: "storage_upload" }, 502);
  }

  let createdAtSeconds = Math.floor(Date.now() / 1000);
  let expiresAtSeconds = createdAtSeconds + 3600;

  localFiles.set(publicId, {
    id: publicId,
    objectPath,
    contentType,
    createdAtSeconds,
    expiresAtSeconds,
    extendedOnce: false
  });

  const cdnBase = config.publicUrl.replace(/\/+$/, "");
  const storageObjectKey = objectPath.replace(/^\/+/, "");
  return json(request, {
    id: publicId,
    url: `${cdnBase}/temp/${publicId}`,
    storage_zone: config.storageZone,
    storage_region: String(config.storageRegion),
    storage_object_key: storageObjectKey,
    expires_at: expiresAtSeconds * 1000,
    expires_at_iso: new Date(expiresAtSeconds * 1000).toISOString(),
    created_at: createdAtSeconds * 1000,
    can_extend: true
  });
}

/** Optional post-upload check: list /temp and confirm the object appears (set VERIFY_STORAGE_LIST=1 when debugging). */
async function assertObjectListedUnderTemp(
  storageZone: ReturnType<typeof getStorageZone>,
  publicId: string
): Promise<void> {
  const maxAttempts = 5;
  const delayMs = 200;
  const zoneLabel = BunnyStorageSDK.zone.name(storageZone);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let entries: Awaited<ReturnType<typeof BunnyStorageSDK.file.list>>;
    try {
      entries = await BunnyStorageSDK.file.list(storageZone, "/temp");
    } catch (err) {
      if (attempt === maxAttempts - 1) {
        throw new Error(
          `Could not list /temp/ in storage zone "${zoneLabel}" after upload: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    const found = entries.some(
      (e) => !e.isDirectory && (String(e.path || "").includes(publicId) || String(e.objectName || "").includes(publicId))
    );
    if (found) return;
    if (attempt < maxAttempts - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(
    `Upload reported OK but "${publicId}" was not found under /temp/ in zone "${zoneLabel}". Check that Edge env BUNNY_STORAGE_ZONE and BUNNY_STORAGE_REGION match the Storage zone you open in the Bunny dashboard (Storage → File manager, not Edge Storage).`
  );
}

async function handleGetSession(request: Request, config: RuntimeConfig) {
  const isAuthenticated = await authenticate(request, config);
  if (!isAuthenticated) return json(request, { error: "Unauthorized" }, 401);
  const headerToken = request.headers.get("x-session-token");
  const cookies = parseCookies(request.headers.get("cookie"));
  const sessionToken = headerToken || cookies.file60_session || "";
  return json(request, {
    authenticated: true,
    // Echo JWT so the SPA can send x-session-token on XHR (cookie alone is flaky cross-subdomain / with some CDNs).
    session_token: sessionToken,
    config: {
      maxFileSize: config.maxFileSize,
      maxFileSizeMB: Math.round((config.maxFileSize / (1024 * 1024)) * 10) / 10,
      expiryHours: 1
    }
  });
}

function allowDatabaseHealthDiag(request: Request): boolean {
  if (env("ALLOW_DB_HEALTH_DIAG", "") === "1" || env("ALLOW_DB_HEALTH_DIAG", "").toLowerCase() === "true") {
    return true;
  }
  try {
    const host = new URL(request.url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

function databaseHostPreview(dbUrl: string | null): string | null {
  if (!dbUrl) return null;
  try {
    return new URL(dbUrl).hostname;
  } catch {
    return null;
  }
}

async function handleHealth(request: Request, config: RuntimeConfig) {
  const runtime = detectRuntime();
  const payload: Record<string, unknown> = {
    ok: true,
    service: "file60-api",
    runtime,
    ts: Date.now()
  };
  return json(request, payload);
}



BunnySDK.net.http.serve({ port: 8787, hostname: "127.0.0.1" }, async (request: Request) => {
  try {
    await ensureDotEnvLoaded();
    const config = getConfig();
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request)
      });
    }

    if (url.pathname === "/api/session" && request.method === "POST") return await handleCreateSession(request, config);
    if (url.pathname === "/api/session" && request.method === "GET") return await handleGetSession(request, config);
    if ((url.pathname === "/healthz" || url.pathname === "/api/health") && request.method === "GET") {
      return await handleHealth(request, config);
    }
    if (url.pathname === "/api/create-file" && request.method === "POST") return await handleCreateFile(request, config);


    if (url.pathname.startsWith("/api/file/")) {
      const id = url.pathname.split("/")[3];
      const localFile = getLocalFile(id);
      if (!localFile) return json(request, { error: "File not found" }, 404);

      const cdnBase = config.publicUrl.replace(/\/+$/, "");
      return new Response(null, {
        status: 302,
        headers: {
          ...getCorsHeaders(request),
          Location: `${cdnBase}/temp/${id}`
        }
      });
    }

    return new Response("Not Found", { status: 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(request, { error: message }, 500);
  }
});

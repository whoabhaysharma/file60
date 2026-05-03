import * as BunnySDK from "@bunny.net/edgescript-sdk";
import * as BunnyStorageSDK from "@bunny.net/storage-sdk";
import { createClient } from "@libsql/client/http";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { SignJWT, jwtVerify } from "jose";

type RuntimeConfig = {
  jwtSecret: string;
  maxFileSize: number;
  publicUrl: string;
  storageZone: string;
  storageAccessKey: string;
  storageRegion: BunnyStorageSDK.regions.StorageRegion;
  dbUrl: string | null;
  dbAuthToken: string | null;
};
type FileRecord = {
  id: string;
  objectPath: string;
  contentType: string;
  createdAtSeconds: number;
  expiresAtSeconds: number;
  extendedOnce: boolean;
};
const MAX_FILE_SIZE_HARD_LIMIT = 300 * 1024 * 1024; // 300MB server-enforced cap
const AD_GATE_WAIT_SECONDS = 30;
const usedAdGateTokens = new Set<string>();
const filesTable = sqliteTable("files", {
  id: text("id").primaryKey(),
  objectPath: text("object_path").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  extendedOnce: integer("extended_once").notNull()
});

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

/** Bunny Database URLs are usually `libsql://…lite.bunnydb.net`; use HTTPS for the HTTP driver on Edge. */
function normalizeLibsqlRemoteUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.startsWith("libsql://")) {
    const hostAndPath = t.slice("libsql://".length).replace(/^\/+/, "").replace(/\/+$/, "");
    return `https://${hostAndPath}`;
  }
  return t.replace(/\/+$/, "");
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const fallback = env("CORS_ORIGIN", "*");
  return {
    "Access-Control-Allow-Origin": origin || fallback,
    "Access-Control-Allow-Credentials": "true",
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
  const dbUrlRaw = env("BUNNY_DATABASE_URL") || null;
  const dbAuthTokenRaw = env("BUNNY_DATABASE_AUTH_TOKEN") || null;
  const dbAuthToken =
    dbAuthTokenRaw && String(dbAuthTokenRaw).trim() ? String(dbAuthTokenRaw).trim() : null;
  const dbUrl =
    dbUrlRaw && dbAuthToken && String(dbUrlRaw).trim()
      ? normalizeLibsqlRemoteUrl(String(dbUrlRaw))
      : null;

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
    storageRegion,
    dbUrl,
    dbAuthToken
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
async function uploadBytesToBunnyStorage(
  storageZone: ReturnType<typeof getStorageZone>,
  objectPath: string,
  body: ArrayBuffer,
  contentType: string
) {
  const url = BunnyStorageSDK.zone.addr(storageZone);
  // Match @bunny.net/storage-sdk file.upload path joining exactly (zone base + object path).
  url.pathname = `${url.pathname}${objectPath}`;
  const [authHeader, accessKey] = BunnyStorageSDK.zone.key(storageZone);
  const headers: Record<string, string> = {
    [authHeader]: accessKey,
    "Content-Type": "application/octet-stream"
  };
  if (contentType) headers["Override-Content-Type"] = contentType;
  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: new Uint8Array(body)
  });
  if (!response.ok) {
    const zoneName = BunnyStorageSDK.zone.name(storageZone);
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    if (response.status === 401) {
      throw new Error(`Unauthorized access to storage zone: ${zoneName}`);
    }
    if (response.status === 400) {
      throw new Error(`Storage rejected upload (400)${detail ? `: ${detail}` : ""}`);
    }
    if (response.status === 404) {
      throw new Error(`File not found: ${objectPath}`);
    }
    throw new Error(`Storage upload failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
}

function requireDatabaseConfig(config: RuntimeConfig) {
  if (!config.dbUrl || !config.dbAuthToken) {
    throw new Error("Missing BUNNY_DATABASE_URL or BUNNY_DATABASE_AUTH_TOKEN");
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

async function createAdGateToken(secret: string, fileId: string) {
  const now = Math.floor(Date.now() / 1000);
  const adReadyAt = now + AD_GATE_WAIT_SECONDS;
  return await new SignJWT({
    typ: "ad_gate",
    fileId,
    adReadyAt
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(adReadyAt + 120)
    .setJti(crypto.randomUUID())
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

async function verifyAdGateToken(token: string, secret: string, fileId: string) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const tokenType = payload.typ;
    const tokenFileId = payload.fileId;
    const adReadyAt = Number(payload.adReadyAt || 0);
    const tokenJti = payload.jti;
    const now = Math.floor(Date.now() / 1000);

    if (tokenType !== "ad_gate") return { ok: false, error: "Invalid ad gate token type" };
    if (tokenFileId !== fileId) return { ok: false, error: "Ad gate token file mismatch" };
    if (!adReadyAt || now < adReadyAt) return { ok: false, error: "Ad watch timer not completed yet" };
    if (!tokenJti || typeof tokenJti !== "string") return { ok: false, error: "Invalid ad gate token id" };
    if (usedAdGateTokens.has(tokenJti)) return { ok: false, error: "Ad gate token already used" };

    usedAdGateTokens.add(tokenJti);
    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid or expired ad gate token" };
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

const schemaInit = new Map<string, Promise<void>>();
const localFiles = new Map<string, FileRecord>();

function getDbClient(config: RuntimeConfig) {
  requireDatabaseConfig(config);
  try {
    return createClient({
      url: config.dbUrl!,
      authToken: config.dbAuthToken!,
      fetch: globalThis.fetch.bind(globalThis)
    });
  } catch (e) {
    throw new Error(`Failed to create libSQL client: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function getOrm(config: RuntimeConfig) {
  return drizzle(getDbClient(config));
}

async function ensureSchema(config: RuntimeConfig) {
  requireDatabaseConfig(config);
  const dbUrl = config.dbUrl!;
  if (!schemaInit.has(dbUrl)) {
    const initPromise = (async () => {
      try {
        const db = getDbClient(config);
        await db.execute(`
          CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            object_path TEXT NOT NULL,
            content_type TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            expires_at INTEGER NOT NULL DEFAULT (strftime('%s','now','+3600 seconds')),
            extended_once INTEGER NOT NULL DEFAULT 0
          )
        `);
        // Backfill old local schemas created before extended_once existed.
        await db.execute(`ALTER TABLE files ADD COLUMN extended_once INTEGER NOT NULL DEFAULT 0`).catch(() => {});
      } catch (e) {
        throw new Error(`Database schema init failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
    schemaInit.set(dbUrl, initPromise);
  }
  await schemaInit.get(dbUrl);
}

function isDatabaseConfigured(config: RuntimeConfig) {
  return Boolean(config.dbUrl && config.dbAuthToken);
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

  // Enforce on actual bytes received so clients cannot bypass with fake X-File-Size.
  const bodyBytes = await request.arrayBuffer();
  const actualFileSize = bodyBytes.byteLength;
  if (actualFileSize <= 0) return badRequest(request, "Missing or invalid file size");
  if (actualFileSize > config.maxFileSize) return json(request, { error: "File too large" }, 413);
  const storageZone = getStorageZone(config);
  try {
    // Ensure /temp exists as a directory so the Storage zone file browser shows a temp folder consistently.
    await BunnyStorageSDK.file.createDirectory(storageZone, "/temp").catch(() => {});
    await uploadBytesToBunnyStorage(storageZone, objectPath, bodyBytes, contentType);
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
  if (isDatabaseConfigured(config)) {
    try {
      await ensureSchema(config);
      const orm = getOrm(config);
      await orm.insert(filesTable).values({
        id: publicId,
        objectPath,
        contentType,
        createdAt: createdAtSeconds,
        expiresAt: expiresAtSeconds,
        extendedOnce: 0
      });
      const rows = await orm
        .select({ createdAt: filesTable.createdAt, expiresAt: filesTable.expiresAt, extendedOnce: filesTable.extendedOnce })
        .from(filesTable)
        .where(eq(filesTable.id, publicId))
        .limit(1);
      const row = rows[0];
      createdAtSeconds = Number(row?.createdAt || createdAtSeconds);
      expiresAtSeconds = Number(row?.expiresAt || expiresAtSeconds);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Database error";
      return json(request, { error: msg, step: "database" }, 503);
    }
  } else {
    localFiles.set(publicId, {
      id: publicId,
      objectPath,
      contentType,
      createdAtSeconds,
      expiresAtSeconds,
      extendedOnce: false
    });
  }

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

function handleHealth(request: Request) {
  return json(request, {
    ok: true,
    service: "file60-api",
    ts: Date.now()
  });
}

async function handleAdGateStart(request: Request, config: RuntimeConfig, fileId: string) {
  const isAuthenticated = await authenticate(request, config);
  if (!isAuthenticated) return json(request, { error: "Invalid or missing session" }, 401);
  if (isDatabaseConfigured(config)) {
    await ensureSchema(config);
    const orm = getOrm(config);
    const rows = await orm
      .select({ extendedOnce: filesTable.extendedOnce })
      .from(filesTable)
      .where(eq(filesTable.id, fileId))
      .limit(1);
    const row = rows[0];
    if (!row) return json(request, { error: "File not found" }, 404);
    if (Number(row.extendedOnce || 0) === 1) {
      return json(request, { error: "File already used its 24h extension" }, 409);
    }
  } else {
    const localFile = getLocalFile(fileId);
    if (!localFile) return json(request, { error: "File not found" }, 404);
    if (localFile.extendedOnce) return json(request, { error: "File already used its 24h extension" }, 409);
  }

  const token = await createAdGateToken(config.jwtSecret, fileId);
  return json(request, {
    ad_gate_token: token,
    wait_seconds: AD_GATE_WAIT_SECONDS
  });
}

async function handleExtendFile(request: Request, config: RuntimeConfig, fileId: string) {
  const isAuthenticated = await authenticate(request, config);
  if (!isAuthenticated) return json(request, { error: "Invalid or missing session" }, 401);
  const adGateToken = request.headers.get("x-ad-gate-token");
  if (!adGateToken) return json(request, { error: "Missing ad gate token" }, 403);
  const adVerification = await verifyAdGateToken(adGateToken, config.jwtSecret, fileId);
  if (!adVerification.ok) return json(request, { error: adVerification.error }, 403);

  let expiresAtSeconds = Math.floor(Date.now() / 1000) + 86400;
  if (isDatabaseConfigured(config)) {
    await ensureSchema(config);
    const orm = getOrm(config);
    const rows = await orm
      .select({ id: filesTable.id, extendedOnce: filesTable.extendedOnce })
      .from(filesTable)
      .where(eq(filesTable.id, fileId))
      .limit(1);
    if (!rows.length) {
      return json(request, { error: "File not found" }, 404);
    }
    if (Number(rows[0].extendedOnce || 0) === 1) {
      return json(request, { error: "File already used its 24h extension" }, 409);
    }
    await orm
      .update(filesTable)
      .set({ expiresAt: expiresAtSeconds, extendedOnce: 1 })
      .where(eq(filesTable.id, fileId));
  } else {
    const localFile = getLocalFile(fileId);
    if (!localFile) return json(request, { error: "File not found" }, 404);
    if (localFile.extendedOnce) return json(request, { error: "File already used its 24h extension" }, 409);
    localFile.expiresAtSeconds = expiresAtSeconds;
    localFile.extendedOnce = true;
    localFiles.set(fileId, localFile);
  }

  return json(request, {
    id: fileId,
    expires_at: expiresAtSeconds * 1000,
    expires_at_iso: new Date(expiresAtSeconds * 1000).toISOString(),
    can_extend: false
  });
}

BunnySDK.net.http.serve({ port: 8787, hostname: "127.0.0.1" }, async (request: Request) => {
  try {
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
      return handleHealth(request);
    }
    if (url.pathname === "/api/create-file" && request.method === "POST") return await handleCreateFile(request, config);
    if (url.pathname.startsWith("/api/file/") && url.pathname.endsWith("/ad-gate/start") && request.method === "POST") {
      const fileId = url.pathname.split("/")[3];
      return await handleAdGateStart(request, config, fileId);
    }
    if (url.pathname.startsWith("/api/file/") && url.pathname.endsWith("/extend") && request.method === "POST") {
      const fileId = url.pathname.split("/")[3];
      return await handleExtendFile(request, config, fileId);
    }

    if (url.pathname.startsWith("/api/file/")) {
      const id = url.pathname.split("/")[3];
      if (isDatabaseConfigured(config)) {
        await ensureSchema(config);
        const orm = getOrm(config);
        const rows = await orm
          .select({ expiresAt: filesTable.expiresAt })
          .from(filesTable)
          .where(eq(filesTable.id, id))
          .limit(1);
        const row = rows[0];
        if (!row) {
          return json(request, { error: "File not found" }, 404);
        }
        const expiresAtSeconds = Number(row.expiresAt || 0);
        if (expiresAtSeconds * 1000 < Date.now()) {
          return json(request, { error: "File expired" }, 410);
        }
      } else {
        const localFile = getLocalFile(id);
        if (!localFile) return json(request, { error: "File not found" }, 404);
      }

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

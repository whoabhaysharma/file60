import * as BunnySDK from "@bunny.net/edgescript-sdk";

// ─── Drizzle/Deno Env Fix ───────────────────────────────────────────────────
// Manually load .env if running in Deno (local dev)
if ((globalThis as any).Deno) {
  for (const f of [".env", ".dev.vars"]) {
    try {
      const txt = (globalThis as any).Deno.readTextFileSync(f);
      for (const line of txt.split("\n")) {
        const parts = line.trim().split("=");
        if (parts.length >= 2 && !parts[0].startsWith("#")) {
          const k = parts[0].trim();
          const v = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
          if (!(globalThis as any).Deno.env.get(k)) (globalThis as any).Deno.env.set(k, v);
        }
      }
    } catch { }
  }
}

import { SignJWT, jwtVerify } from "jose";
import { AwsClient } from "aws4fetch";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const AD_GATE_WAIT_SECONDS = 30;
const usedAdGateTokens = new Set<string>();

// ─── Environment ─────────────────────────────────────────────────────────────

function env(key: string, fallback = ""): string {
  try {
    const v = (globalThis as any).Deno?.env?.get?.(key);
    if (v && String(v).trim()) return String(v).trim();
  } catch { }
  try {
    const b = (globalThis as any).Bunny?.env;
    if (b) {
      const v = typeof b.get === "function" ? b.get(key) : b[key];
      if (v && String(v).trim()) return String(v).trim();
    }
  } catch { }
  return fallback;
}

// ─── Config ──────────────────────────────────────────────────────────────────

type Config = {
  jwtSecret: string;
  maxFileSize: number;
  publicUrl: string;
  s3Endpoint: string;
  s3Region: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3BucketName: string;
  dbUrl: string;
  dbToken: string;
};

function getConfig(): Config {
  const jwtSecret = env("JWT_SECRET");
  const s3Endpoint = env("B2_ENDPOINT");
  const s3Region = env("B2_REGION", "us-east-005");
  const s3AccessKeyId = env("B2_ACCESS_KEY_ID");
  const s3SecretAccessKey = env("B2_SECRET_ACCESS_KEY");
  const s3BucketName = env("B2_BUCKET_NAME");
  const publicUrl = env("BUNNY_PUBLIC_URL", "").replace(/\/+$/, "");
  const maxFileSize = Math.min(
    Number.parseInt(env("MAX_FILE_SIZE", `${MAX_FILE_SIZE}`)) || MAX_FILE_SIZE,
    MAX_FILE_SIZE
  );

  const missing = [];
  if (!jwtSecret) missing.push("JWT_SECRET");
  if (!s3Endpoint) missing.push("B2_ENDPOINT");
  if (!s3AccessKeyId) missing.push("B2_ACCESS_KEY_ID");
  if (!s3SecretAccessKey) missing.push("B2_SECRET_ACCESS_KEY");
  if (!s3BucketName) missing.push("B2_BUCKET_NAME");
  if (!publicUrl) missing.push("BUNNY_PUBLIC_URL");

  if (missing.length) {
    const error = `Missing environment variables: ${missing.join(", ")}`;
    console.error("[CONFIG ERROR]", error);
    throw new Error(error);
  }

  // Diagnostic Log (Masked)
  console.log(`[INIT] Config loaded. S3: ${s3BucketName}`);

  return { jwtSecret, maxFileSize, publicUrl, s3Endpoint, s3Region, s3AccessKeyId, s3SecretAccessKey, s3BucketName };
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "*";
  const allowed = env("CORS_ORIGIN", "*");
  const resolvedOrigin =
    allowed === "*" ? origin :
      allowed.split(",").map(s => s.trim()).includes(origin) ? origin : "null";

  return {
    "Access-Control-Allow-Origin": resolvedOrigin,
    "Access-Control-Allow-Credentials": resolvedOrigin !== "*" ? "true" : "false",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-session-token, x-ad-gate-token",
    "Access-Control-Expose-Headers": "ETag",
    "Vary": "Origin",
  };
}

function json(request: Request, data: unknown, status = 200) {
  if (status >= 400) {
    console.error(`[API ${status}] ${request.method} ${new URL(request.url).pathname}`, data);
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function signToken(secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ iat: now })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime("24h")
    .sign(new TextEncoder().encode(secret));
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { clockTolerance: 60 });
    return true;
  } catch {
    return false;
  }
}

/** Reads ONLY the x-session-token header — simple and cross-origin safe. */
async function authenticate(request: Request, config: Config): Promise<boolean> {
  const token = request.headers.get("x-session-token") || "";
  if (!token) return false;
  return verifyToken(token, config.jwtSecret);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitize(name: string): string {
  let s = name.replace(/[^a-zA-Z0-9.\-_() ]/g, "_").replace(/\s+/g, "_");
  if (s.length > 100) s = s.slice(0, 100);
  return s || "file.bin";
}

function getAwsClient(config: Config) {
  return new AwsClient({
    accessKeyId: config.s3AccessKeyId,
    secretAccessKey: config.s3SecretAccessKey,
    region: config.s3Region,
    service: "s3"
  });
}

function getS3(config: Config) {
  return new S3Client({
    endpoint: config.s3Endpoint,
    region: config.s3Region,
    credentials: { accessKeyId: config.s3AccessKeyId, secretAccessKey: config.s3SecretAccessKey },
    forcePathStyle: true,
  });
}

// ─── Ad Gate ─────────────────────────────────────────────────────────────────

async function signAdGateToken(secret: string, fileId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const readyAt = now + AD_GATE_WAIT_SECONDS;
  return new SignJWT({ typ: "ad_gate", fileId, readyAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(readyAt + 120)
    .setJti(crypto.randomUUID())
    .sign(new TextEncoder().encode(secret));
}

async function verifyAdGateToken(
  token: string, secret: string, fileId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { clockTolerance: 60 });
    if (payload.typ !== "ad_gate") return { ok: false, error: "Wrong token type" };
    if (payload.fileId !== fileId) return { ok: false, error: "Token file mismatch" };
    const readyAt = Number(payload.readyAt || 0);
    if (!readyAt || Math.floor(Date.now() / 1000) < readyAt) return { ok: false, error: "Timer not complete" };
    const jti = String(payload.jti || "");
    if (!jti || usedAdGateTokens.has(jti)) return { ok: false, error: "Token already used" };
    usedAdGateTokens.add(jti);
    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid or expired ad gate token" };
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCreateSession(request: Request, config: Config) {
  const token = await signToken(config.jwtSecret);
  return json(request, {
    session_token: token,
    max_file_size: config.maxFileSize,
  });
}

async function handleGetUploadUrl(request: Request, config: Config) {
  if (!await authenticate(request, config)) {
    return json(request, { error: "Invalid or missing session" }, 401);
  }

  let body: any;
  try { body = await request.json(); } catch { return json(request, { error: "Invalid JSON body" }, 400); }

  const { name, type, size } = body;
  if (!name || size === undefined || size === null) return json(request, { error: "Missing name or size" }, 400);

  const sizeNum = typeof size === "number" ? size : parseInt(String(size), 10);
  if (!Number.isInteger(sizeNum) || sizeNum < 0 || sizeNum > config.maxFileSize) {
    return json(request, { error: `File too large or invalid size. Max: ${config.maxFileSize} bytes` }, 400);
  }

  const safeName = sanitize(String(name));
  const id = `${crypto.randomUUID().slice(0, 8)}-${safeName}`;
  const objectKey = `temp/${id}`;
  const contentType = type || "application/octet-stream";
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600;

  // Generate presigned URL for B2 with metadata
  const s3 = getS3(config);
  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: config.s3BucketName,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: sizeNum,
    Metadata: {
      "file-name": safeName,
      "file-type": contentType,
      "file-size": String(sizeNum),
      "created-at": String(now),
      "expires-at": String(expiresAt),
      "extended": "false"
    }
  }), { expiresIn: 3600 });

  return json(request, { id, uploadUrl, expiresAt: expiresAt * 1000 });
}

async function handleConfirmUpload(request: Request, config: Config) {
  if (!await authenticate(request, config)) {
    return json(request, { error: "Invalid or missing session" }, 401);
  }

  let body: any;
  try { body = await request.json(); } catch { return json(request, { error: "Invalid JSON body" }, 400); }

  const { id } = body;
  if (!id || typeof id !== "string") return json(request, { error: "Missing file id" }, 400);

  // Verify file exists in B2 and get metadata
  const aws = getAwsClient(config);
  const objectKey = id.startsWith("temp/") ? id : `temp/${id}`;
  const url = `${config.s3Endpoint}/${config.s3BucketName}/${objectKey}`;

  try {
    const res = await aws.fetch(url, { method: "HEAD" });
    if (!res.ok) throw new Error("File not found");

    const metadata: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      if (k.startsWith("x-amz-meta-")) {
        metadata[k.replace("x-amz-meta-", "")] = v;
      }
    });

    return json(request, buildFileResponse(id, metadata, config));
  } catch (err: any) {
    return json(request, { error: "File not found in storage. Upload may have failed." }, 400);
  }
}

async function handleGetFile(request: Request, config: Config, id: string) {
  const aws = getAwsClient(config);
  const objectKey = id.startsWith("temp/") ? id : `temp/${id}`;
  const url = `${config.s3Endpoint}/${config.s3BucketName}/${objectKey}`;

  try {
    const res = await aws.fetch(url, { method: "HEAD" });
    if (!res.ok) throw new Error("Not found");

    const expiry = Number(res.headers.get("x-amz-meta-expires-at") || 0);
    const now = Math.floor(Date.now() / 1000);

    if (expiry && now > expiry) {
      return json(request, { error: "File expired" }, 410);
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders(request), Location: `${config.publicUrl}/${objectKey}` },
    });
  } catch {
    return json(request, { error: "File not found" }, 404);
  }
}

async function handleAdGateStart(request: Request, config: Config, fileId: string) {
  if (!await authenticate(request, config)) return json(request, { error: "Unauthorized" }, 401);

  const aws = getAwsClient(config);
  const objectKey = fileId.startsWith("temp/") ? fileId : `temp/${fileId}`;
  const url = `${config.s3Endpoint}/${config.s3BucketName}/${objectKey}`;

  try {
    const res = await aws.fetch(url, { method: "HEAD" });
    if (!res.ok) throw new Error("Not found");

    const createdAt = Number(res.headers.get("x-amz-meta-created-at") || 0);
    const expiresAt = Number(res.headers.get("x-amz-meta-expires-at") || 0);
    const extended = res.headers.get("x-amz-meta-extended") === "true";
    const now = Math.floor(Date.now() / 1000);

    const maxExpiry = createdAt + 86400;
    if (extended) return json(request, { error: "Already extended once" }, 409);
    if (expiresAt >= maxExpiry) return json(request, { error: "Already at max extension" }, 409);

    if (now >= maxExpiry || (expiresAt && now > expiresAt)) {
      return json(request, { error: "File expired" }, 410);
    }

    const token = await signAdGateToken(config.jwtSecret, fileId);
    return json(request, { ad_gate_token: token, wait_seconds: AD_GATE_WAIT_SECONDS });
  } catch {
    return json(request, { error: "File not found" }, 404);
  }
}

async function handleExtendFile(request: Request, config: Config) {
  let body: any;
  try { body = await request.json(); } catch { return json(request, { error: "Invalid JSON body" }, 400); }

  const id = body.id;
  const ad_gate_token = body.ad_gate_token || request.headers.get("x-ad-gate-token");

  if (!id || !ad_gate_token) return json(request, { error: "Missing parameters" }, 400);

  const check = await verifyAdGateToken(ad_gate_token, config.jwtSecret, id);
  if (!check.ok) return json(request, { error: check.error }, 403);

  const aws = getAwsClient(config);
  const objectKey = id.startsWith("temp/") ? id : `temp/${id}`;
  const url = `${config.s3Endpoint}/${config.s3BucketName}/${objectKey}`;

  try {
    const headRes = await aws.fetch(url, { method: "HEAD" });
    if (!headRes.ok) throw new Error("File not found");

    const createdAt = Number(headRes.headers.get("x-amz-meta-created-at") || 0);
    const extended = headRes.headers.get("x-amz-meta-extended") === "true";
    const now = Math.floor(Date.now() / 1000);

    const maxExpiry = createdAt + 86400;
    if (extended) return json(request, { error: "Already extended once" }, 409);
    if (now >= maxExpiry) return json(request, { error: "File expired" }, 410);

    // Update metadata using CopyObject
    // In raw S3 API, this is a PUT with x-amz-copy-source and metadata headers
    const copyUrl = `${config.s3Endpoint}/${config.s3BucketName}/${objectKey}`;
    const res = await aws.fetch(copyUrl, {
      method: "PUT",
      headers: {
        "x-amz-copy-source": `/${config.s3BucketName}/${objectKey}`,
        "x-amz-metadata-directive": "REPLACE",
        "x-amz-meta-file-name": headRes.headers.get("x-amz-meta-file-name") || "",
        "x-amz-meta-file-type": headRes.headers.get("x-amz-meta-file-type") || "",
        "x-amz-meta-file-size": headRes.headers.get("x-amz-meta-file-size") || "",
        "x-amz-meta-created-at": String(createdAt),
        "x-amz-meta-expires-at": String(maxExpiry),
        "x-amz-meta-extended": "true",
        "Content-Type": headRes.headers.get("Content-Type") || "application/octet-stream"
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`S3 Copy failed: ${res.status} ${text}`);
    }

    const metadata = {
      "expires-at": String(maxExpiry),
      "created-at": String(createdAt),
      "extended": "true"
    };

    return json(request, buildFileResponse(id, metadata, config));
  } catch (err: any) {
    return json(request, { error: "Extend failed: " + err.message }, 500);
  }
}

function buildFileResponse(id: string, metadata: Record<string, string>, config: Config) {
  const expiresAt = Number(metadata["expires-at"] || 0);
  const createdAt = Number(metadata["created-at"] || 0);
  const extended = metadata["extended"] === "true";
  const maxExpiry = createdAt + 86400;

  return {
    id: id.replace(/^temp\//, ""),
    url: `${config.publicUrl}/temp/${id.replace(/^temp\//, "")}`,
    expires_at: expiresAt * 1000,
    created_at: createdAt * 1000,
    can_extend: !extended && expiresAt < maxExpiry,
  };
}

// ─── Bootstrap & Serve ───────────────────────────────────────────────────────

BunnySDK.net.http.serve({ port: 8787, hostname: "0.0.0.0" }, async (request: Request) => {
  try {
    const config = getConfig();
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // Health check
    if (path === "/api/health") {
      return json(request, { ok: true, service: "file60-api" });
    }

    // Session
    if (path === "/api/session" && request.method === "POST") {
      return handleCreateSession(request, config);
    }

    // Upload flow
    if (path === "/api/get-upload-url" && request.method === "POST") {
      return handleGetUploadUrl(request, config);
    }
    if (path === "/api/confirm-upload" && request.method === "POST") {
      return handleConfirmUpload(request, config);
    }

    // File redirect
    if (path.startsWith("/api/file/") && request.method === "GET") {
      const id = path.split("/")[3];
      if (id) return handleGetFile(request, config, id);
    }

    // Extend file (ad gate)
    const adGateMatch = path.match(/^\/api\/file\/([^/]+)\/extend\/ad-gate\/start$/);
    if (adGateMatch && request.method === "POST") {
      return handleAdGateStart(request, config, decodeURIComponent(adGateMatch[1]));
    }
    if (path === "/api/extend-file" && request.method === "POST") {
      return handleExtendFile(request, config);
    }

    return new Response("Not Found", { status: 404 });
  } catch (err: any) {
    const errDetails = JSON.stringify(err, Object.getOwnPropertyNames(err));
    console.error("[UNHANDLED FULL]", errDetails);

    const msg = err?.message || String(err);
    try {
      return new Response(JSON.stringify({
        error: msg,
        details: errDetails,
        debug: { s3: config.s3BucketName }
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response("Internal Server Error", { status: 500 });
    }
  }
});

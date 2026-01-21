import { CONFIG, json, error } from './utils.js';
import { createJWT } from './auth.js';

export async function initSession(secret) {
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

export async function createFile(req, env) {
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

    // UPDATED: Now returns the full CDN URL pointing to the file key
    const publicUrl = `${CONFIG.R2_PUBLIC_URL}/${objectKey}`;

    return json({
        id: fileId,
        url: publicUrl,
        expires_at: expiryTimestamp,
        expires_at_iso: new Date(expiryTimestamp).toISOString()
    });
}

export async function getFile(req, env) {
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
            "Access-Control-Allow-Origin": "*",
            "X-File-Expires": expires ? new Date(expires).toISOString() : "never"
        }
    });
}

import { json, error, verifyTurnstile } from './utils.js';
import { createJWT } from './auth.js';

export async function initSession(req, env, config) {
    const turnstileToken = req.headers.get("x-turnstile-token");
    const ip = req.headers.get("CF-Connecting-IP");

    if (!turnstileToken) {
        // Optional: Allow bypassing in dev if needed, or fail hard.
        // For now, fail hard.
        throw { message: "Turnstile token required", status: 403 };
    }

    const isValid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
    if (!isValid) {
        throw { message: "Invalid Captcha", status: 403 };
    }

    const now = Math.floor(Date.now() / 1000);
    const token = await createJWT({ iat: now, exp: now + 86400 }, env.JWT_SECRET);
    return json({
        token,
        config: {
            maxFileSize: config.MAX_FILE_SIZE,
            maxFileSizeMB: Math.round(config.MAX_FILE_SIZE / (1024 * 1024) * 10) / 10,
            expiryHours: config.EXPIRY_MS / (60 * 60 * 1000)
        }
    });
}


import { getDownloadUrl } from './utils.js';
import { generatePresignedUrl, getFileFromS3 } from './aws.js';

export async function createFile(req, env, config) {
    console.log("ENV KEYS:", Object.keys(env)); // DEBUG: Check what vars are loaded
    if (req.method !== "POST") throw { message: "Method not allowed", status: 405 };

    // We no longer read the body here. The CLIENT uploads the body to the URL we return.

    // Validate request metadata
    const fileSize = Number(req.headers.get("X-File-Size") || req.headers.get("Content-Length"));
    // Note: With presigned URLs, we enforce size via Signed URL headers or rely on bucket policies, 
    // but checking intent here is good UI UX.
    if (fileSize > config.MAX_FILE_SIZE) throw { message: "File too large", status: 413 };

    const contentType = req.headers.get("X-File-Type") || req.headers.get("Content-Type") || "application/octet-stream";

    // Get Filename from header (encoded)
    const encodedName = req.headers.get("X-File-Name");
    let rawName = "file.bin";

    if (encodedName) {
        try {
            const decoded = decodeURIComponent(encodedName);
            if (decoded.trim()) rawName = decoded;
        } catch (e) {
            // keep default
        }
    }

    // Basic sanitization:
    // Replace dangerous chars with underscore.
    // Allow: alphanumerics, dots, hyphens, spaces, underscores, parenthesis
    let safeName = rawName.replace(/[^a-zA-Z0-9.\-\s_()]/g, "_").replace(/\s+/g, "_");

    // Edge Case: Very Long Name (Truncate to 100 chars to avoid OS/R2 specific limits)
    if (safeName.length > 100) {
        // preserve extension if it exists and is reasonable length (e.g. < 10 chars)
        const parts = safeName.split('.');
        const ext = parts.length > 1 ? `.${parts.pop()}` : '';

        if (ext.length < 15) {
            const nameBody = parts.join('.');
            const maxBodyLen = 100 - ext.length;
            safeName = nameBody.substring(0, Math.max(1, maxBodyLen)) + ext;
        } else {
            // ext too long or weird, just hard truncate
            safeName = safeName.substring(0, 100);
        }
    }

    // Edge Case: Result became empty (e.g. filename was "???")
    if (!safeName || safeName === "." || safeName === "..") {
        safeName = "file.bin";
    }

    // Generate Short ID (8 chars)
    const fileId = crypto.randomUUID();
    const shortId = fileId.slice(0, 8);

    // Construct Key: shortId-filename
    // Note: We use the full fileId as the "ID" returned to the client for consistency, 
    // OR we can change the ID to be the objectKey. 
    // The user requested "file name should be... prefix of short id".
    // Let's use the objectKey as the unique identifier for the response too, 
    // so the download URL matches.
    const objectKey = `temp/${shortId}-${safeName}`;

    // Ref: if we want the ID returned to UI to be able to find the file later, 
    // we should validly return the "logical id" which probably is just the filename part or the whole key suffix.
    // However, the `getDownloadUrl` uses `fileId` to construct `/api/file/${fileId}`.
    // So `fileId` variable below MUST be what we want in the URL.
    const publicId = `${shortId}-${safeName}`;

    // Calculate expiry
    const now = Date.now();
    const expiryTimestamp = now + config.EXPIRY_MS;
    const cacheControl = `public, max-age=${Math.floor(config.EXPIRY_MS / 1000)}`;

    let uploadUrl;
    try {
        // 1. Generate Presigned PUT URL
        // We pass the ENV to the helper because that's where the secrets live
        // Enforce Content-Length in the signature to prevent size abuse
        uploadUrl = await generatePresignedUrl(env, objectKey, contentType, fileSize, cacheControl);
    } catch (err) {
        // Fallback or Error if Keys missing
        console.error("Presign Error:", err);
        throw { message: "Server configuration requires R2 Keys for uploads", status: 500 };
    }

    // 2. Generate Public Download URL
    // For local dev, we still point to worker. For prod, we point to CDN.
    const urlObj = new URL(req.url);
    const cdnUrl = config.R2_PUBLIC_URL;
    const publicUrl = getDownloadUrl(urlObj, publicId, cdnUrl);

    // 3. (Optional) We could pre-insert metadata into KV here if we wanted to track files 
    // without listing the bucket, but for now we trust the client to upload.
    // If we wanted to store "expires" metadata in R2, we have to pass it in the Headers of the PUT request.

    return json({
        id: publicId,
        upload_url: uploadUrl, // usage: PUT request with file body
        required_headers: {
            "Content-Type": contentType,
            "Cache-Control": cacheControl
        },
        url: publicUrl,
        expires_at: expiryTimestamp,
        expires_at_iso: new Date(expiryTimestamp).toISOString(),
        created_at: now
    });
}

export async function getFile(req, env) {
    const id = req.url.split("/").pop();
    const file = await getFileFromS3(env, `temp/${id}`);

    if (!file) return error("File not found", 404);

    const expires = Number(file.Metadata?.expires);
    if (expires && Date.now() > expires) {
        return error("File expired", 410);
    }

    return new Response(file.Body, {
        headers: {
            "Content-Type": file.ContentType || "application/octet-stream",
            "Access-Control-Allow-Origin": "*",
            "X-File-Expires": expires ? new Date(expires).toISOString() : "never"
        }
    });
}

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import * as BunnyStorageSDK from "@bunny.net/storage-sdk";

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, "ui", "dist");

function parseEnvFile(text) {
    const env = {};
    for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
    return env;
}

async function loadLocalEnv() {
    const files = [".dev.vars", ".env"];
    for (const file of files) {
        try {
            const fullPath = path.join(projectRoot, file);
            const text = await readFile(fullPath, "utf8");
            const parsed = parseEnvFile(text);
            for (const [key, value] of Object.entries(parsed)) {
                if (!process.env[key]) process.env[key] = value;
            }
        } catch {
            // ignore missing env files
        }
    }
}

function getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const map = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".ico": "image/x-icon",
        ".woff": "font/woff",
        ".woff2": "font/woff2"
    };
    return map[ext] || "application/octet-stream";
}

function getCacheControl(fileName) {
    if (fileName.endsWith(".html")) {
        return "public, max-age=60";
    }
    return "public, max-age=31536000, immutable";
}

async function listFiles(dir, baseDir = dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listFiles(fullPath, baseDir)));
        } else if (entry.isFile()) {
            files.push({
                fullPath,
                key: path.relative(baseDir, fullPath).replaceAll(path.sep, "/")
            });
        }
    }
    return files;
}

async function main() {
    await loadLocalEnv();

    const bucket = process.env.BUNNY_STORAGE_ZONE;
    const secretAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
    const storageRegionName = process.env.BUNNY_STORAGE_REGION || "Falkenstein";

    if (!secretAccessKey || !bucket) {
        throw new Error("Missing Bunny storage credentials. Required: BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY");
    }
    const region = BunnyStorageSDK.regions.StorageRegion[storageRegionName];
    if (!region) {
        throw new Error(`Unsupported BUNNY_STORAGE_REGION: ${storageRegionName}`);
    }

    const distStats = await stat(distDir).catch(() => null);
    if (!distStats?.isDirectory()) {
        throw new Error(`Missing build output: ${distDir}. Run 'npm run build:ui' first.`);
    }

    const storageZone = BunnyStorageSDK.zone.connect_with_accesskey(region, bucket, secretAccessKey);

    const files = await listFiles(distDir);
    console.log(`Uploading ${files.length} files to bunny://${bucket} ...`);

    for (const file of files) {
        const body = await readFile(file.fullPath);
        const contentType = getContentType(file.key);
        const cacheControl = getCacheControl(file.key); // kept for possible future metadata handling
        void cacheControl;
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array(body));
                controller.close();
            }
        });
        await BunnyStorageSDK.file.upload(storageZone, `/${file.key}`, stream, { contentType });

        console.log(`uploaded: ${file.key}`);
    }

    console.log("Bunny upload complete.");
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});

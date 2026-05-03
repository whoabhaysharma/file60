import { readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();

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

async function main() {
    await loadLocalEnv();

    const apiKey = process.env.BUNNY_API_KEY;
    const pullZoneId = process.env.BUNNY_PULL_ZONE_ID;

    if (!apiKey || !pullZoneId) {
        console.log("Skipping Bunny purge: set BUNNY_API_KEY and BUNNY_PULL_ZONE_ID to enable it.");
        return;
    }

    const res = await fetch(`https://api.bunny.net/pullzone/${pullZoneId}/purgeCache`, {
        method: "POST",
        headers: { AccessKey: apiKey }
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Bunny purge failed (${res.status}): ${body}`);
    }

    console.log("Bunny CDN cache purge requested.");
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});

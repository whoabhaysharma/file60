export const CONFIG = {
    // 1. UPDATED: Using your BunnyCDN URL
    R2_PUBLIC_URL: "https://file60.b-cdn.net",
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    RATE_LIMIT_HITS: 20,
    EXPIRY_MS: 1 * 60 * 60 * 1000,
};

export function b64(str) { return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
export function b64_raw(bin) { return btoa(String.fromCharCode(...new Uint8Array(bin))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
export function json(d) { return new Response(JSON.stringify(d), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }); }
export function error(m, s) { return new Response(JSON.stringify({ error: m }), { status: s, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }); }
export function handleOptions() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-session-token",
        }
    });
}

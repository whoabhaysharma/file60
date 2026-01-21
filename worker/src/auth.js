import { SignJWT, jwtVerify } from 'jose';

export async function withAuth(req, env, ctx, config, handler) {
    const token = req.headers.get("x-session-token");
    if (!token) throw { message: "Missing session token", status: 401 };

    const secret = env.JWT_SECRET;
    const payload = await verifyJWT(token, secret);
    if (!payload) throw { message: "Invalid or expired session", status: 403 };

    const ip = req.headers.get("CF-Connecting-IP") || "anonymous";
    await checkRateLimit(ip, ctx, config);

    return handler(req, env, config);
}

async function checkRateLimit(ip, ctx, config) {
    const cache = caches.default;
    const cacheKey = new Request(`https://ratelimit.local/ip/${ip}`);

    let cachedRes = await cache.match(cacheKey);
    let count = cachedRes ? parseInt(await cachedRes.text()) : 0;

    // Use config value
    if (count >= config.RATE_LIMIT_HITS) {
        throw { message: "Rate limit reached.", status: 429 };
    }

    const response = new Response((count + 1).toString(), {
        headers: { "Cache-Control": "max-age=3600" }
    });

    ctx.waitUntil(cache.put(cacheKey, response));
}

export async function createJWT(payload, secret) {
    const secretKey = new TextEncoder().encode(secret);
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // Set expiry explicitly using jose's API
        .sign(secretKey);
}

export async function verifyJWT(token, secret) {
    try {
        const secretKey = new TextEncoder().encode(secret);
        const { payload } = await jwtVerify(token, secretKey);
        return payload;
    } catch (e) {
        return null;
    }
}

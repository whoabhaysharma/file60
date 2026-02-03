

export function getDownloadUrl(requestUrlObj, fileId, cdnUrl) {
    // Usage: Production (or forced in Dev) -> Serve via CDN if configured
    if (cdnUrl && !cdnUrl.includes('workers.dev')) {
        return `${cdnUrl}/temp/${fileId}`;
    }

    if (requestUrlObj.hostname === 'localhost' || requestUrlObj.hostname === '127.0.0.1') {
        // Usage: Local development -> Serve via Worker (Fallback)
        return `${requestUrlObj.origin}/api/file/${fileId}`;
    }

    // Fallback
    return `${requestUrlObj.origin}/api/file/${fileId}`;
}


// Helper to get allowed origin
export const getAllowedOrigin = (requestOrigin) => {
    // Modify this list based on your needs
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://file60.pages.dev',
        'https://file60.com'
    ];
    // Also allow any localhost port for dev flexibility if needed, or stick to specific list
    if (requestOrigin && (allowedOrigins.includes(requestOrigin) || requestOrigin.startsWith('http://localhost:'))) {
        return requestOrigin;
    }
    return 'null'; // Fail safe
};

export const corsHeaders = (origin) => ({
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT",
    "Access-Control-Allow-Headers": "Content-Type, x-session-token, x-turnstile-token, X-File-Name, X-File-Size, X-File-Type, Cookie",
    "Access-Control-Allow-Credentials": "true"
});

export function json(d, req, extraHeaders = {}) {
    const origin = req?.headers.get("Origin");
    return new Response(JSON.stringify(d), {
        headers: {
            "Content-Type": "application/json",
            ...corsHeaders(getAllowedOrigin(origin)),
            ...extraHeaders
        }
    });
}

export function error(m, s, req) {
    const origin = req?.headers.get("Origin");
    return new Response(JSON.stringify({ error: m }), {
        status: s,
        headers: {
            "Content-Type": "application/json",
            ...corsHeaders(getAllowedOrigin(origin))
        }
    });
}

export function handleOptions(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
        headers: corsHeaders(getAllowedOrigin(origin))
    });
}

export async function verifyTurnstile(token, secretKey, ip) {
    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    try {
        const result = await fetch(url, {
            body: formData,
            method: 'POST',
        });

        const outcome = await result.json();
        if (!outcome.success) {
            console.error("Turnstile verification failed:", outcome);
            return false;
        }
        return true;
    } catch (err) {
        console.error("Turnstile error:", err);
        return false; // Fail secure
    }
}

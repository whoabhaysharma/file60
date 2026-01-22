import { handleOptions, error } from './utils.js';
import { initSession, createFile, getFile } from './handlers.js';
import { withAuth } from './auth.js';
import { getConfig } from './config.js';

export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url);
        const config = getConfig(env);

        if (req.method === "OPTIONS") return handleOptions();

        try {
            if (url.pathname === "/api/init-session") {
                const secret = env.JWT_SECRET;
                const turnstileToken = req.headers.get("X-Turnstile-Token");
                return await initSession(secret, config, turnstileToken);
            }

            if (url.pathname === "/api/create-file") {
                return await withAuth(req, env, ctx, config, createFile);
            }

            // NOTE: getFile is now technically redundant if you use the Public URL,
            // but keeping it here for fallback/private access.
            if (url.pathname.startsWith("/api/file/")) {
                return await getFile(req, env);
            }

            return new Response("Not Found", { status: 404 });
        } catch (err) {
            return error(err.message, err.status || 500);
        }
    }
};

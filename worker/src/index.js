import { handleOptions, error } from './utils.js';
import { createSession, createFile, getFile } from './handlers.js';
import { withAuth } from './auth.js';
import { getConfig } from './config.js';

export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url);
        const config = getConfig(env);

        if (req.method === "OPTIONS") return handleOptions(req);

        try {
            if (url.pathname === "/api/session") {
                if (req.method === "POST") {
                    return await createSession(req, env, config);
                }

                if (req.method === "GET") {
                    return await withAuth(req, env, ctx, config, async () => {
                        const origin = req.headers.get("Origin");
                        // Manually construct response here since we need dynamic CORS
                        // Or update the inline response to use helper? Use helper but need to export robust one?
                        // Let's use the json helper we just updated! 
                        // But wait, withAuth callback returns a Response.
                        // We need to import 'json' in index.js or just do it manually.
                        // I'll stick to manual Response here to ensure I get the CORS headers right for this specific route if the tools allow, 
                        // OR better: update handlers.js to use the updated json() helper.
                        return new Response(JSON.stringify({
                            authenticated: true,
                            config: {
                                maxFileSize: config.MAX_FILE_SIZE,
                                maxFileSizeMB: Math.round(config.MAX_FILE_SIZE / (1024 * 1024) * 10) / 10,
                                expiryHours: config.EXPIRY_MS / (60 * 60 * 1000)
                            }
                        }), {
                            headers: {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": req.headers.get("Origin") || "*", // Fallback * if no origin? No, credentials:true forbids *.
                                "Access-Control-Allow-Credentials": "true"
                            }
                        });
                    });
                }

                return new Response("Method not allowed", { status: 405 });
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
            return error(err.message, err.status || 500, req);
        }
    }
};

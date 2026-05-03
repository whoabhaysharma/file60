import { useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useConfig } from '../context/ConfigContext.jsx';

/**
 * Custom hook for API operations
 */
export function useApi() {
    const { sessionToken, setSessionToken, setSessionReady } = useApp();
    const { apiUrl, updateServerConfig } = useConfig();

    const checkSession = useCallback(async () => {
        try {
            const response = await fetch(`${apiUrl}/api/session`, {
                credentials: 'include',
                headers: sessionToken && typeof sessionToken === 'string'
                    ? { 'x-session-token': sessionToken }
                    : undefined
            });
            if (response.status === 200) {
                const data = await response.json();
                setSessionToken(true);
                if (data.config) updateServerConfig(data.config);
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }, [apiUrl, sessionToken, setSessionToken, updateServerConfig]);

    const initSession = useCallback(async (turnstileToken) => {
        try {
            if (!apiUrl) {
                console.warn('API URL not configured. Please set window.APP_CONFIG.API_URL in config.js');
                return;
            }

            const headers = {};
            if (turnstileToken) {
                headers['x-turnstile-token'] = turnstileToken;
            }

            const response = await fetch(`${apiUrl}/api/session`, {
                method: 'POST',
                credentials: 'include',
                headers
            });

            if (!response.ok) {
                const details = await response.text().catch(() => '');
                throw new Error(`Failed to initialize session (${response.status})${details ? `: ${details}` : ''}`);
            }

            // Cookie is set automatically by the browser from Set-Cookie header
            const data = await response.json();
            setSessionToken(data.session_token || true); // Prefer explicit token for header auth fallback
            if (data.config) updateServerConfig(data.config);
            setSessionReady(true);
            return data;
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error('Backend API is not reachable. Start backend before uploading.');
            }
            console.error('Init session error:', error);
            throw error;
        }
    }, [apiUrl, setSessionToken, setSessionReady, updateServerConfig]);

    const uploadFile = useCallback((file, uploadSessionToken, onProgress) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${apiUrl}/api/create-file`, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader('X-File-Type', file.type || 'application/octet-stream');
            xhr.setRequestHeader('X-File-Size', file.size.toString());
            xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
            if (uploadSessionToken && typeof uploadSessionToken === 'string') {
                xhr.setRequestHeader('x-session-token', uploadSessionToken);
            }

            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable || typeof onProgress !== 'function') return;
                onProgress(event.loaded, event.total);
            };

            xhr.onerror = () => {
                reject(new Error('Network error while uploading.'));
            };

            xhr.onload = () => {
                const raw = xhr.responseText || '';
                if (xhr.status < 200 || xhr.status >= 300) {
                    reject(new Error(`Failed to upload (${xhr.status})${raw ? `: ${raw}` : ''}`));
                    return;
                }

                try {
                    resolve(JSON.parse(raw));
                } catch {
                    reject(new Error('Upload succeeded but response was not valid JSON.'));
                }
            };

            xhr.send(file);
        });
    }, [apiUrl]);

    const startExtendAdGate = useCallback(async (fileId) => {
        const response = await fetch(`${apiUrl}/api/file/${fileId}/ad-gate/start`, {
            method: 'POST',
            credentials: 'include',
            headers: sessionToken && typeof sessionToken === 'string'
                ? { 'x-session-token': sessionToken }
                : undefined
        });

        if (!response.ok) {
            const details = await response.text().catch(() => '');
            throw new Error(`Failed to start ad gate (${response.status})${details ? `: ${details}` : ''}`);
        }

        return await response.json();
    }, [apiUrl, sessionToken]);

    const extendFileExpiry = useCallback(async (fileId, adGateToken) => {
        const response = await fetch(`${apiUrl}/api/file/${fileId}/extend`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                ...(sessionToken && typeof sessionToken === 'string'
                    ? { 'x-session-token': sessionToken }
                    : {}),
                'x-ad-gate-token': adGateToken
            }
        });

        if (!response.ok) {
            const details = await response.text().catch(() => '');
            throw new Error(`Failed to extend expiry (${response.status})${details ? `: ${details}` : ''}`);
        }

        return await response.json();
    }, [apiUrl, sessionToken]);

    return {
        initSession,
        uploadFile,
        checkSession,
        startExtendAdGate,
        extendFileExpiry
    };
}

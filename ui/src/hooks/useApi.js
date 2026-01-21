import { useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useConfig } from '../context/ConfigContext.jsx';

/**
 * Custom hook for API operations
 */
export function useApi() {
    const { setSessionToken } = useApp();
    const { apiUrl, updateServerConfig } = useConfig();

    const initSession = useCallback(async () => {
        try {
            if (!apiUrl) {
                console.warn('API URL not configured. Please set window.APP_CONFIG.API_URL in config.js');
                return;
            }

            const response = await fetch(`${apiUrl}/api/init-session`);

            if (!response.ok) {
                throw new Error('Failed to initialize session');
            }

            const data = await response.json();
            setSessionToken(data.token);
            updateServerConfig(data.config);

            return data;
        } catch (error) {
            console.error('Init session error:', error);
            throw error;
        }
    }, [apiUrl, setSessionToken, updateServerConfig]);

    const uploadFile = useCallback(async (file, sessionToken) => {
        // This is now just a metadata request to get the Presigned URL
        const response = await fetch(`${apiUrl}/api/create-file`, {
            method: 'POST',
            headers: {
                'x-session-token': sessionToken,
                'Content-Type': file.type || 'application/octet-stream',
                'Content-Length': file.size.toString(),
                'X-File-Name': encodeURIComponent(file.name) // Encode to handle special chars safe in headers
            }
            // No body needed for the initial request in this flow, OR we can send empty body.
            // But standard practice for "starting an upload" is often to just send metadata.
            // HOWEVER, our current Worker expects a POST.
            // If I change the worker to NOT expect a body, that's fine.
            // But the Worker currently doesn't read the body in the new `createFile` handler (it generates URL).
            // So we can send an empty body or just null.
        });

        if (!response.ok) {
            throw new Error('Failed to initiate upload');
        }

        return await response.json();
    }, [apiUrl]);

    return {
        initSession,
        uploadFile
    };
}

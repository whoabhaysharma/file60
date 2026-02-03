import { useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useConfig } from '../context/ConfigContext.jsx';

/**
 * Custom hook for API operations
 */
export function useApi() {
    const { setSessionToken, setSessionReady } = useApp();
    const { apiUrl, updateServerConfig } = useConfig();

    const checkSession = useCallback(async () => {
        try {
            const response = await fetch(`${apiUrl}/api/session`, {
                credentials: 'include'
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
    }, [apiUrl, setSessionToken, updateServerConfig]);

    const initSession = useCallback(async (turnstileToken) => {
        try {
            if (!apiUrl) {
                console.warn('API URL not configured. Please set window.APP_CONFIG.API_URL in config.js');
                return;
            }

            const response = await fetch(`${apiUrl}/api/session`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'x-turnstile-token': turnstileToken || ''
                }
            });

            if (!response.ok) {
                throw new Error('Failed to initialize session');
            }

            // Cookie is set automatically by the browser from Set-Cookie header
            const data = await response.json();
            setSessionToken(true); // Mark as authenticated
            if (data.config) updateServerConfig(data.config);
            setSessionReady(true);
            return data;
        } catch (error) {
            console.error('Init session error:', error);
            throw error;
        }
    }, [apiUrl, setSessionToken, setSessionReady, updateServerConfig]);

    const uploadFile = useCallback(async (file) => {
        // This is now just a metadata request to get the Presigned URL
        // Cookie is sent automatically
        const response = await fetch(`${apiUrl}/api/create-file`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': file.type || 'application/octet-stream',
                'X-File-Type': file.type || 'application/octet-stream',
                'Content-Length': file.size.toString(),
                'X-File-Size': file.size.toString(),
                'X-File-Name': encodeURIComponent(file.name)
            }
        });

        if (!response.ok) {
            throw new Error('Failed to initiate upload');
        }

        return await response.json();
    }, [apiUrl]);

    return {
        initSession,
        uploadFile,
        checkSession
    };
}

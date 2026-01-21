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

    const uploadFile = useCallback((file, sessionToken, onProgress) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percent = (e.loaded / e.total) * 100;
                    onProgress(percent, e.loaded, e.total);
                }
            });

            xhr.onload = function () {
                try {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const resData = JSON.parse(xhr.responseText);
                        resolve(resData);
                    } else {
                        reject(new Error('Upload failed'));
                    }
                } catch (e) {
                    reject(e);
                }
            };

            xhr.onerror = () => {
                reject(new Error('Network error'));
            };

            xhr.open('POST', `${apiUrl}/api/create-file`);
            xhr.setRequestHeader('x-session-token', sessionToken);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.send(file);
        });
    }, [apiUrl]);

    return {
        initSession,
        uploadFile
    };
}

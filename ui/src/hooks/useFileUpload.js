import { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useConfig } from '../context/ConfigContext.jsx';
import { useApi } from './useApi.js';
import { validateFile } from '../utils/validators.js';

/**
 * Custom hook for file upload functionality
 */
export function useFileUpload(onSuccess, onError) {
    const { addFile, isUploading, setIsUploading, sessionToken } = useApp();
    const { serverConfig } = useConfig();
    const { uploadFile: apiUploadFile } = useApi();
    const [uploadProgress, setUploadProgress] = useState(0);
    const rafRef = useRef(null);
    const pendingProgressRef = useRef(0);

    const setProgressOptimized = useCallback((value) => {
        pendingProgressRef.current = value;
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            setUploadProgress(pendingProgressRef.current);
        });
    }, []);

    const uploadFile = useCallback(async (file, overrideToken) => {
        // Validate
        const validation = validateFile(file, serverConfig.maxFileSize);
        if (!validation.valid) {
            onError?.(validation.error);
            return;
        }

        const tokenToUse = overrideToken || sessionToken;

        // Check if already uploading
        if (isUploading) {
            return;
        }

        // Check for session token
        if (!tokenToUse) {
            onError?.('Session token not available');
            return;
        }

        setIsUploading(true);
        setProgressOptimized(0);

        try {
            // Real upload progress (bytes sent) with UI-throttled updates.
            const resData = await apiUploadFile(file, tokenToUse, (loaded, total) => {
                if (!total) return;
                // Keep small headroom for backend finalize/response parsing.
                const pct = Math.min(95, Math.round((loaded / total) * 95));
                setProgressOptimized(pct);
            });
            setProgressOptimized(100);

            // Add file to state
            const fileData = {
                id: resData.id,
                name: file.name,
                url: resData.url,
                type: file.type || 'text/plain',
                expires: resData.expires_at,
                created: resData.created_at,
                canExtend: resData.can_extend !== false
            };

            addFile(fileData);
            onSuccess?.('FILE UPLOADED. NSA NOTIFIED.');
        } catch (error) {
            console.error(error);
            onError?.(error.message || 'Upload failed.');
        } finally {
            setIsUploading(false);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            setUploadProgress(0);
        }
    }, [
        isUploading,
        sessionToken,
        serverConfig.maxFileSize,
        setIsUploading,
        apiUploadFile,
        setProgressOptimized,
        addFile,
        onSuccess,
        onError
    ]);

    return {
        uploadFile,
        isUploading,
        uploadProgress
    };
}

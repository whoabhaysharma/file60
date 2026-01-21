import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useConfig } from '../context/ConfigContext.jsx';
import { useApi } from './useApi.js';
import { validateFile } from '../utils/validators.js';

/**
 * Custom hook for file upload functionality
 */
export function useFileUpload(onSuccess, onError) {
    const { addFile, isUploading, setIsUploading, sessionToken } = useApp();
    const { apiUrl, serverConfig } = useConfig();
    const { uploadFile: apiUploadFile } = useApi();
    const [uploadProgress, setUploadProgress] = useState(0);

    const uploadFile = useCallback(async (file) => {
        // Validate
        const validation = validateFile(file, serverConfig.maxFileSize);
        if (!validation.valid) {
            onError?.(validation.error);
            return;
        }

        // Check if already uploading or no session
        if (isUploading || !sessionToken) {
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const resData = await apiUploadFile(file, sessionToken, (percent) => {
                setUploadProgress(percent);
            });

            // Construct download URL
            const downloadUrl = resData.url.startsWith('http')
                ? resData.url
                : `${apiUrl}${resData.url}`;

            // Add file to state
            const fileData = {
                id: resData.id,
                name: file.name,
                url: downloadUrl,
                type: file.type || 'text/plain',
                expires: resData.expires_at || 'never',
                created: Date.now()
            };

            addFile(fileData);
            onSuccess?.('FILE UPLOADED. NSA NOTIFIED.');
        } catch (error) {
            onError?.(error.message || 'Upload failed.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    }, [
        isUploading,
        sessionToken,
        serverConfig.maxFileSize,
        apiUrl,
        setIsUploading,
        apiUploadFile,
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

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
        setUploadProgress(1); // Start

        try {
            // Step 1: Get Presigned URL from Backend
            const resData = await apiUploadFile(file, sessionToken);

            if (!resData.upload_url) {
                throw new Error('Server did not provide an upload URL.');
            }

            // Step 2: Upload directly to R2 using the Presigned URL
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = (e.loaded / e.total) * 100;
                        setUploadProgress(percent);
                    }
                });

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));

                xhr.open('PUT', resData.upload_url);
                xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
                // Note: If we added custom metadata in generating the signed URL, we MUST match headers here.
                xhr.send(file);
            });

            // Add file to state
            const fileData = {
                id: resData.id,
                name: file.name,
                url: resData.url,
                type: file.type || 'text/plain',
                expires: resData.expires_at,
                created: resData.created_at
            };

            addFile(fileData);
            onSuccess?.('FILE UPLOADED. NSA NOTIFIED.');
        } catch (error) {
            console.error(error);
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

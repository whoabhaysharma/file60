import { useState, useCallback, useRef } from 'react';
import { initSession, hasSession, getUploadUrl, confirmUpload } from '../api.js';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB default, overridden by server

/**
 * Manages the full file upload lifecycle:
 * 1. Ensure we have a session (create one if not)
 * 2. Get a presigned URL from the backend
 * 3. PUT the file directly to B2
 * 4. Confirm the upload with the backend
 */
export function useFileUpload(onSuccess, onError) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const rafRef = useRef(null);

    const setProgress = useCallback((pct) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            setUploadProgress(pct);
        });
    }, []);

    const uploadFile = useCallback(async (file, { onFileReady } = {}) => {
        if (!file) return;
        if (isUploading) return;

        if (file.size > MAX_FILE_SIZE) {
            onError?.(`File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
            return;
        }

        setIsUploading(true);
        setProgress(0);

        try {
            // Step 1: Ensure session
            if (!hasSession()) {
                await initSession();
            }

            // Step 2: Get presigned upload URL
            const { id, uploadUrl } = await getUploadUrl(
                file.name,
                file.type || 'application/octet-stream',
                file.size
            );

            // Step 3: Upload directly to B2 via XHR (for progress tracking)
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl, true);
                xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) setProgress((e.loaded / e.total) * 95);
                };
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve();
                    else reject(new Error(`Storage upload failed (${xhr.status}): ${xhr.responseText}`));
                };
                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(file);
            });

            setProgress(97);

            // Step 4: Confirm with backend
            const fileData = await confirmUpload(id);
            setProgress(100);

            onFileReady?.({
                id: fileData.id,
                name: file.name,
                url: fileData.url,
                type: file.type || 'application/octet-stream',
                expires: fileData.expires_at,
                created: fileData.created_at,
                canExtend: fileData.can_extend !== false,
            });

            onSuccess?.('FILE UPLOADED. NSA NOTIFIED.');
        } catch (err) {
            console.error('[Upload error]', err);
            onError?.(err.message || 'Upload failed');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        }
    }, [isUploading, setProgress, onSuccess, onError]);

    return { uploadFile, isUploading, uploadProgress };
}

import { useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';

/**
 * Custom hook for managing file expiration timers
 */
export function useTimer(onExpire) {
    const { files, removeFile } = useApp();

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const expiredIds = [];

            files.forEach(file => {
                // Ensure expiration check is reliable (handle both types if needed, but timestamp expected)
                // If compare against string, it might fail. Assume timestamp.
                if (file.expires !== 'never' && file.expires <= now) {
                    expiredIds.push(file.id);
                }
            });

            if (expiredIds.length > 0) {
                // Batch remove
                expiredIds.forEach(id => {
                    removeFile(id);
                    onExpire?.(id);
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [files, removeFile, onExpire]);
}

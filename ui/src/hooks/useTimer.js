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

            files.forEach(file => {
                if (file.expires !== 'never' && file.expires <= now) {
                    removeFile(file.id);
                    onExpire?.(file.id);
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [files, removeFile, onExpire]);
}

import { useState, useCallback } from 'react';
import { NOTIFICATION_DURATION } from '../utils/constants.js';

/**
 * Custom hook for managing notifications
 */
export function useNotification() {
    const [notification, setNotification] = useState(null);

    const showNotification = useCallback((message, type = 'error') => {
        setNotification({ message, type, visible: true });

        const duration = type === 'success'
            ? NOTIFICATION_DURATION.SUCCESS
            : NOTIFICATION_DURATION.ERROR;

        setTimeout(() => {
            setNotification(prev => prev ? { ...prev, visible: false } : null);
        }, duration);
    }, []);

    const showSuccess = useCallback((message) => {
        showNotification(message, 'success');
    }, [showNotification]);

    const showError = useCallback((message) => {
        showNotification(message, 'error');
    }, [showNotification]);

    return {
        notification,
        showNotification,
        showSuccess,
        showError
    };
}

import { useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { STORAGE_KEY } from '../utils/constants.js';

/**
 * Custom hook for localStorage persistence
 */
export function useLocalStorage() {
    const { files } = useApp();

    // Save files whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
        } catch (error) {
            console.error('Error saving files to storage:', error);
        }
    }, [files]);
}

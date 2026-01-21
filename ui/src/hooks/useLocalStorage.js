import { useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { STORAGE_KEY } from '../utils/constants.js';

/**
 * Custom hook for localStorage persistence
 */
export function useLocalStorage() {
    const { files, setFiles } = useApp();

    // Load files on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const loadedFiles = JSON.parse(saved);
                // Filter out expired files
                const validFiles = loadedFiles.filter(f => {
                    if (f.expires === 'never') return true;
                    return Date.now() < f.expires;
                });
                setFiles(validFiles);
            }
        } catch (error) {
            console.error('Error loading files from storage:', error);
        }
    }, [setFiles]);

    // Save files whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
        } catch (error) {
            console.error('Error saving files to storage:', error);
        }
    }, [files]);
}

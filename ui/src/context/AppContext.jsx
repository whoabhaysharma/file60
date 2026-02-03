import React, { createContext, useContext, useState } from 'react';
import { STORAGE_KEY } from '../utils/constants.js';

const AppContext = createContext();

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}

export function AppProvider({ children }) {
    const [files, setFiles] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const loadedFiles = JSON.parse(saved);
                // Filter out expired files
                return loadedFiles.filter(f => {
                    if (f.expires === 'never') return true;
                    return Date.now() < f.expires;
                });
            }
        } catch (error) {
            console.error('Error initializing files from storage:', error);
        }
        return [];
    });

    const [sessionToken, setSessionToken] = useState(null); // Now acts as "isAuthenticated" flag or holds dummy value

    const [isUploading, setIsUploading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [initializeSession, setInitializeSession] = useState(() => null);

    const addFile = (file) => {
        setFiles(prev => [file, ...prev]);
    };

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const value = {
        files,
        setFiles,
        addFile,
        removeFile,
        isUploading,
        setIsUploading,
        sessionToken,
        setSessionToken,
        sessionReady,
        setSessionReady,
        isInitializing,
        setIsInitializing,
        initializeSession,
        setInitializeSession
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

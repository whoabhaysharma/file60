import React, { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'file60_v3';

const AppContext = createContext();

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
}

export function AppProvider({ children }) {
    const [files, setFiles] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const loaded = JSON.parse(saved);
                return loaded.filter(f => f.expires === 'never' || Date.now() < f.expires);
            }
        } catch {}
        return [];
    });

    const [isUploading, setIsUploading] = useState(false);

    const addFile = (file) => setFiles(prev => [file, ...prev]);
    const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));
    const updateFile = (id, updates) => setFiles(prev =>
        prev.map(f => f.id === id ? { ...f, ...updates } : f)
    );

    // Persist to localStorage whenever files change
    React.useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(files)); } catch {}
    }, [files]);

    return (
        <AppContext.Provider value={{ files, setFiles, addFile, removeFile, updateFile, isUploading, setIsUploading }}>
            {children}
        </AppContext.Provider>
    );
}

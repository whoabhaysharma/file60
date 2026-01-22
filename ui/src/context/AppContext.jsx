import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}

export function AppProvider({ children }) {
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [sessionToken, setSessionToken] = useState(null);
    const [sessionReady, setSessionReady] = useState(false);

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
        setSessionReady
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

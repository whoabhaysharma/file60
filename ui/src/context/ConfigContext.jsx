import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_CONFIG } from '../utils/constants.js';

const ConfigContext = createContext();

export function useConfig() {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within ConfigProvider');
    }
    return context;
}

export function ConfigProvider({ children }) {
    const [apiUrl, setApiUrl] = useState('');
    const [serverConfig, setServerConfig] = useState(DEFAULT_CONFIG);

    useEffect(() => {
        // Load config from window.APP_CONFIG
        const configApiUrl = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || '';
        setApiUrl(configApiUrl.replace(/\/$/, '')); // Remove trailing slash
    }, []);

    const updateServerConfig = (config) => {
        if (config) {
            setServerConfig({
                maxFileSize: config.maxFileSize || DEFAULT_CONFIG.maxFileSize,
                maxFileSizeMB: config.maxFileSizeMB || DEFAULT_CONFIG.maxFileSizeMB
            });
        }
    };

    const value = {
        apiUrl,
        serverConfig,
        updateServerConfig
    };

    return (
        <ConfigContext.Provider value={value}>
            {children}
        </ConfigContext.Provider>
    );
}

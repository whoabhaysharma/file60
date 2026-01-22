import React, { useEffect, useState, useRef } from 'react';
import { AppProvider } from './context/AppContext.jsx';
import { ConfigProvider } from './context/ConfigContext.jsx';
import { useApi } from './hooks/useApi.js';
import { useFileUpload } from './hooks/useFileUpload.js';
import { useNotification } from './hooks/useNotification.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useTimer } from './hooks/useTimer.js';
import { Notification } from './components/Notification.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { FileGrid } from './components/FileGrid.jsx';
import { DragDropOverlay } from './components/DragDropOverlay.jsx';
import { Resizer } from './components/Resizer.jsx';
import './styles/index.css';

function AppContent() {
    const { initSession } = useApi();
    const { notification, showSuccess, showError } = useNotification();
    const { uploadFile, isUploading, uploadProgress } = useFileUpload(showSuccess, showError);
    const [dragActive, setDragActive] = useState(false);
    const [dragCounter, setDragCounter] = useState(0);
    const sidebarRef = useRef(null);

    // Initialize localStorage sync
    useLocalStorage();

    // Initialize timer for file expiration
    useTimer();

    // Initialize session on mount (Wait for Turnstile)
    useEffect(() => {
        let widgetId;
        let mounted = true;
        let pollInterval;

        const renderTurnstile = () => {
            const siteKey = (window.APP_CONFIG && window.APP_CONFIG.TURNSTILE_SITE_KEY) || import.meta.env.VITE_TURNSTILE_SITE_KEY;

            if (!siteKey) {
                console.error("Turnstile Site Key not found");
                return;
            }

            try {
                widgetId = window.turnstile.render('#turnstile-widget', {
                    sitekey: siteKey,
                    callback: async (token) => {
                        if (!mounted) return;
                        try {
                            await initSession(token);
                        } catch (err) {
                            showError(`INIT FAILED: ${err.message || 'Unknown error'}`);
                        }
                    },
                    'error-callback': () => {
                        if (!mounted) return;
                        console.error("Turnstile widget error");
                    }
                });
            } catch (err) {
                console.error("Failed to render Turnstile:", err);
            }
        };

        // Poll for Turnstile script to load
        let attempts = 0;
        pollInterval = setInterval(() => {
            attempts++;
            if (window.turnstile && mounted) {
                clearInterval(pollInterval);
                renderTurnstile();
            } else if (attempts >= 50) { // 5 seconds timeout
                clearInterval(pollInterval);
                console.warn("Turnstile script timeout");
                if (mounted) {
                    initSession().catch(err => console.error(err));
                }
            }
        }, 100);

        return () => {
            mounted = false;
            if (pollInterval) clearInterval(pollInterval);
            if (window.turnstile && widgetId) {
                try {
                    window.turnstile.remove(widgetId);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        };
    }, [initSession, showError]);

    // Drag and drop handlers
    useEffect(() => {
        const handleDragEnter = (e) => {
            e.preventDefault();
            setDragCounter(prev => {
                const newCount = prev + 1;
                if (newCount === 1) setDragActive(true);
                return newCount;
            });
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            setDragCounter(prev => {
                const newCount = prev - 1;
                if (newCount === 0) setDragActive(false);
                return newCount;
            });
        };

        const handleDragOver = (e) => {
            e.preventDefault();
        };

        const handleDrop = (e) => {
            e.preventDefault();
            setDragCounter(0);
            setDragActive(false);

            if (e.dataTransfer.files.length > 0) {
                uploadFile(e.dataTransfer.files[0]);
            }
        };

        document.addEventListener('dragenter', handleDragEnter);
        document.addEventListener('dragleave', handleDragLeave);
        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('drop', handleDrop);

        return () => {
            document.removeEventListener('dragenter', handleDragEnter);
            document.removeEventListener('dragleave', handleDragLeave);
            document.removeEventListener('dragover', handleDragOver);
            document.removeEventListener('drop', handleDrop);
        };
    }, [uploadFile]);

    return (
        <div className="flex flex-col h-screen bg-grid">
            {/* Turnstile widget - Cloudflare controls visibility automatically */}
            <div id="turnstile-widget"></div>

            <Notification notification={notification} />
            <DragDropOverlay active={dragActive} />

            <main className="flex flex-col md:flex-row flex-grow overflow-hidden">
                <Sidebar
                    ref={sidebarRef}
                    onFileSelect={uploadFile}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                />

                <Resizer sidebarRef={sidebarRef} />

                <section className="flex-grow flex flex-col overflow-hidden">
                    <div className="flex-grow overflow-y-auto p-8 custom-scroll">
                        <FileGrid />
                    </div>
                    <div className="p-3 m-4 border-[2px] border-black/20 text-[10px] font-bold opacity-60 uppercase italic text-center shrink-0">
                        Your data is safe with us. (Note: We lost the decryption key anyway).
                    </div>
                </section>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <ConfigProvider>
            <AppProvider>
                <AppContent />
            </AppProvider>
        </ConfigProvider>
    );
}

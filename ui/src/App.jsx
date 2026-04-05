import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { ConfigProvider } from './context/ConfigContext.jsx';
import { useApi } from './hooks/useApi.js';
import { useFileUpload } from './hooks/useFileUpload.js';
import { useNotification } from './hooks/useNotification.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { Notification } from './components/Notification.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { FileGrid } from './components/FileGrid.jsx';
import { DragDropOverlay } from './components/DragDropOverlay.jsx';
import { Resizer } from './components/Resizer.jsx';
import { FileUploadZone } from './components/FileUploadZone.jsx';
import { CodeEditor } from './components/CodeEditor.jsx';
import { MobileHeader } from './components/MobileHeader.jsx';
import { BottomNav } from './components/BottomNav.jsx';

import './styles/index.css';

function AppContent() {
    const { showError, showSuccess, notification } = useNotification();
    const { uploadFile, isUploading, uploadProgress } = useFileUpload(showSuccess, showError);
    const { sessionToken } = useApp();
    useLocalStorage();

    const [dragActive, setDragActive] = useState(false);
    const sidebarRef = useRef(null);
    const [activeMobileTab, setActiveMobileTab] = useState('files');

    const handleFileUpload = useCallback(async (file) => {
        if (!file) return;

        try {
            if (!sessionToken) {
                showError("Session expired. Please refresh.");
                return;
            }
            await uploadFile(file, sessionToken);
        } catch (err) {
            showError(err.message || "Upload failed");
        }
    }, [sessionToken, uploadFile, showError]);

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    return (
        <div
            className="flex flex-col h-dvh bg-grid relative"
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragActive(false);
                }
            }}
            onDrop={handleDrop}
        >
            <Notification notification={notification} />

            <DragDropOverlay active={dragActive} />

            {/* Desktop View */}
            <div className="hidden md:flex flex-row h-full w-full overflow-hidden">
                <Sidebar
                    ref={sidebarRef}
                    onFileSelect={handleFileUpload}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                />

                <Resizer sidebarRef={sidebarRef} />

                <div className="flex-1 flex flex-col min-w-0 bg-bg relative">
                    <div className="flex-1 overflow-y-auto custom-scroll relative bg-grid">
                        <div className="p-8 pb-32 min-h-full flex flex-col">
                            <FileGrid />

                        </div>
                    </div>

                </div>
            </div>

            {/* Mobile View */}
            <div className="flex md:hidden flex-col h-full w-full overflow-hidden">
                <MobileHeader />
                <div className="flex-grow overflow-hidden flex flex-col relative">
                    {activeMobileTab === 'files' && (
                        <div className="flex-grow overflow-y-auto p-4 custom-scroll">
                            <FileGrid />

                        </div>
                    )}
                    {activeMobileTab === 'upload' && (
                        <div className="flex-grow overflow-y-auto p-4 custom-scroll flex flex-col">
                            <FileUploadZone
                                onFileSelect={handleFileUpload}
                                isUploading={isUploading}
                                uploadProgress={uploadProgress}
                            />
                        </div>
                    )}
                    {activeMobileTab === 'code' && (
                        <div className="flex-grow flex flex-col overflow-hidden p-4">
                            <CodeEditor
                                onUpload={handleFileUpload}
                                isUploading={isUploading}
                                uploadProgress={uploadProgress}
                            />
                        </div>
                    )}
                </div>
                <BottomNav activeTab={activeMobileTab} onTabChange={setActiveMobileTab} />
            </div>
        </div>
    );
}

function Gatekeeper() {
    const { sessionToken, setIsInitializing } = useApp();
    const { initSession, checkSession } = useApi();
    const [booting, setBooting] = useState(true);
    const [bootError, setBootError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const hasSession = await checkSession();
                if (cancelled) return;
                if (!hasSession) {
                    setIsInitializing(true);
                    await initSession();
                }
            } catch (e) {
                console.error('Session bootstrap failed:', e);
                if (!cancelled) setBootError(e);
            } finally {
                if (!cancelled) {
                    setIsInitializing(false);
                    setBooting(false);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [checkSession, initSession, setIsInitializing]);

    if (booting) return null;

    if (bootError || !sessionToken) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg text-ink gap-4 p-6 text-center">
                <p className="text-sm font-bold uppercase max-w-md text-ink/80">
                    Could not start a session. Check your connection and try again.
                </p>
                <button
                    type="button"
                    className="px-4 py-2 border-4 border-ink bg-accent text-black font-black uppercase text-xs shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </button>
            </div>
        );
    }

    return <AppContent />;
}

export default function App() {
    useEffect(() => {
        localStorage.setItem('file60_user_visited', 'true');
    }, []);

    return (
        <ConfigProvider>
            <AppProvider>
                <Gatekeeper />
            </AppProvider>
        </ConfigProvider>
    );
}



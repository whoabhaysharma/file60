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
import TurnstileCaptcha from './components/TurnstileCaptcha.jsx';
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
                        <div className="p-8 pb-32">
                            <FileGrid />
                        </div>
                    </div>
                    <div className="p-3 m-4 border-[2px] border-ink/20 text-[10px] font-bold opacity-60 uppercase italic text-center shrink-0">
                        Your data is safe with us.
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
                            <div className="p-3 m-4 border-[2px] border-ink/20 text-[10px] font-bold opacity-60 uppercase italic text-center shrink-0">
                                Your data is safe with us.
                            </div>
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
    const [turnstileVerified, setTurnstileVerified] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Initial session check
    useEffect(() => {
        const verify = async () => {
            setCheckingAuth(true);
            await checkSession();
            setCheckingAuth(false);
        };
        verify();
    }, [checkSession]);

    // If still checking, show nothing or loading state
    if (checkingAuth) return null;

    // If authenticated (sessionToken is true), show app
    if (sessionToken) {
        return <AppContent />;
    }

    // Handle verification success
    const handleVerify = (token) => {
        if (token) {
            setTimeout(async () => {
                try {
                    setTurnstileVerified(true);
                    setIsInitializing(true);
                    await initSession(token);
                } catch (error) {
                    console.error("Session initialization failed:", error);
                    setTurnstileVerified(false);
                } finally {
                    setIsInitializing(false);
                }
            }, 1500);
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg text-ink">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-black mb-2 text-ink tracking-tighter -skew-x-6">
                    FILE<span className="text-accent">60</span><span className="animate-pulse">_</span>
                </h1>
                <div className="text-accent font-bold text-xs uppercase tracking-widest border border-accent/30 inline-block px-3 py-1 rounded-full animate-pulse">
                    SECURITY_CHECKPOINT
                </div>
            </div>
            <div className="bg-terminal p-6 border-[6px] border-ink shadow-brutal flex flex-col items-center gap-4">
                <div className="bg-white p-2">
                    <TurnstileCaptcha onVerify={handleVerify} />
                </div>
                <div className="text-[10px] font-bold uppercase text-ink/50 text-center max-w-[240px]">
                    <span className="text-accent">&gt;&gt;</span> VERIFY HUMANITY TO PROCEED
                </div>
            </div>
            <div className="mt-8 text-center max-w-md text-[10px] font-bold uppercase text-ink/30 px-4">
                SYSTEM SECURED // 2048-BIT ENCRYPTION
            </div>
        </div>
    );
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



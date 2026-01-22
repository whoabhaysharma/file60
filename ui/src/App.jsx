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

/**
 * Turnstile Component
 * Features: Immediate load, Success animation delay, and Auto-hide logic.
 */
const TurnstileCaptcha = ({ onVerify }) => {
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);
    const [isVisible, setIsVisible] = useState(true);

    const renderWidget = useCallback(() => {
        const siteKey = (window.APP_CONFIG && window.APP_CONFIG.TURNSTILE_SITE_KEY) || import.meta.env.VITE_TURNSTILE_SITE_KEY;

        if (window.turnstile && containerRef.current && !widgetIdRef.current) {
            widgetIdRef.current = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                theme: 'light',
                callback: (token) => {
                    onVerify(token);
                    // Delay the removal so the user sees the "Success" animation
                    setTimeout(() => {
                        setIsVisible(false);
                    }, 1500);
                },
                'expired-callback': () => {
                    onVerify(null);
                    setIsVisible(true);
                    window.turnstile.reset(widgetIdRef.current);
                },
                'error-callback': () => {
                    onVerify(null);
                    setIsVisible(true);
                },
            });
        }
    }, [onVerify]);

    useEffect(() => {
        if (window.turnstile) {
            renderWidget();
        } else {
            window.onloadTurnstileCallback = renderWidget;
        }

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [renderWidget]);

    return (
        <div
            className={`fixed bottom-6 right-6 z-[9999] transition-all duration-700 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
        >
            <div ref={containerRef} className="shadow-2xl rounded-lg overflow-hidden" />
        </div>
    );
};

function AppContent() {
    const { initSession } = useApi();
    const { showError, showSuccess, notification } = useNotification();
    const { uploadFile, isUploading, uploadProgress } = useFileUpload(showSuccess, showError);
    const { setIsInitializing } = useApp();
    useLocalStorage();

    const [turnstileToken, setTurnstileToken] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const sidebarRef = useRef(null);
    const [activeMobileTab, setActiveMobileTab] = useState('files');

    const handleFileUpload = useCallback(async (file) => {
        if (!file) return;

        if (!turnstileToken) {
            showError("Security check in progress. Please wait.");
            return;
        }

        try {
            setIsInitializing(true);
            const sessionData = await initSession(turnstileToken);
            setIsInitializing(false);
            await uploadFile(file, sessionData.token);
        } catch (err) {
            showError(err.message || "Session initialization failed");
        } finally {
            setIsInitializing(false);
        }
    }, [turnstileToken, initSession, uploadFile, setIsInitializing, showError]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    return (
        <div
            className="flex flex-col h-dvh bg-grid relative"
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
        >
            {/* Background verification with 1.5s delay before fading out */}
            <TurnstileCaptcha onVerify={setTurnstileToken} />

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

                <section className="flex-grow flex flex-col overflow-hidden">
                    <div className="flex-grow overflow-y-auto p-8 custom-scroll">
                        <FileGrid />
                    </div>
                    <div className="p-3 m-4 border-[2px] border-black/20 text-[10px] font-bold opacity-60 uppercase italic text-center shrink-0">
                        Your data is safe with us.
                    </div>
                </section>
            </div>

            {/* Mobile View */}
            <div className="flex md:hidden flex-col h-full w-full overflow-hidden">
                <MobileHeader />
                <div className="flex-grow overflow-hidden flex flex-col relative">
                    {activeMobileTab === 'files' && (
                        <div className="flex-grow overflow-y-auto p-4 custom-scroll">
                            <FileGrid />
                            <div className="p-3 m-4 border-[2px] border-black/20 text-[10px] font-bold opacity-60 uppercase italic text-center shrink-0">
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
                            <CodeEditor onUpload={handleFileUpload} />
                        </div>
                    )}
                </div>
                <BottomNav activeTab={activeMobileTab} onTabChange={setActiveMobileTab} />
            </div>
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

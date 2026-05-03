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
    const { initSession } = useApi();
    const { uploadFile, isUploading, uploadProgress } = useFileUpload(showSuccess, showError);
    const { sessionToken } = useApp();
    useLocalStorage();

    const [dragActive, setDragActive] = useState(false);
    const [showTurnstile, setShowTurnstile] = useState(false);
    const sidebarRef = useRef(null);
    const [activeMobileTab, setActiveMobileTab] = useState('files');
    const turnstileWidgetIdRef = useRef(null);
    const turnstileTokenRef = useRef(null);
    const turnstileResolverRef = useRef(null);
    const uploadingBatchRef = useRef(false);

    const ensureTurnstileToken = useCallback(async () => {
        if (turnstileTokenRef.current) return turnstileTokenRef.current;

        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const siteKey =
            import.meta.env.VITE_TURNSTILE_SITE_KEY ||
            (isLocalhost ? '1x00000000000000000000AA' : '0x4AAAAAACOKCe1pikeARO-o');
        if (!siteKey) throw new Error('Captcha site key is missing');

        setShowTurnstile(true);

        const waitForTurnstile = () => new Promise((resolve, reject) => {
            const started = Date.now();
            const check = () => {
                if (window.turnstile) return resolve(window.turnstile);
                if (Date.now() - started > 10000) return reject(new Error('Captcha failed to load'));
                setTimeout(check, 200);
            };
            check();
        });

        const turnstile = await waitForTurnstile();

        if (turnstileWidgetIdRef.current) {
            turnstile.reset(turnstileWidgetIdRef.current);
        } else {
            turnstileWidgetIdRef.current = turnstile.render('#turnstile-widget', {
                sitekey: siteKey,
                theme: 'light',
                callback: (token) => {
                    turnstileTokenRef.current = token;
                    setShowTurnstile(false);
                    if (turnstileResolverRef.current) {
                        turnstileResolverRef.current(token);
                        turnstileResolverRef.current = null;
                    }
                },
                'expired-callback': () => {
                    turnstileTokenRef.current = null;
                    setShowTurnstile(true);
                },
                'error-callback': () => {
                    turnstileTokenRef.current = null;
                    setShowTurnstile(true);
                }
            });
        }

        return await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (turnstileResolverRef.current) turnstileResolverRef.current = null;
                reject(new Error('Captcha timed out, please try again'));
            }, 120000);

            turnstileResolverRef.current = (token) => {
                clearTimeout(timeout);
                resolve(token);
            };
        });
    }, []);

    const handleFileUpload = useCallback(async (file) => {
        if (!file) return;

        try {
            let activeSessionToken = sessionToken;
            if (!sessionToken) {
                try {
                    // First try without captcha. If backend requires captcha, then show it.
                    const sessionData = await initSession();
                    activeSessionToken = sessionData?.session_token || activeSessionToken;
                } catch (initErr) {
                    const message = initErr?.message || '';
                    const captchaRequired = message.includes('(400)') || message.includes('(403)');
                    if (!captchaRequired) throw initErr;

                    showSuccess("Complete captcha to start your first upload.");
                    const captchaToken = await ensureTurnstileToken();
                    const sessionData = await initSession(captchaToken);
                    activeSessionToken = sessionData?.session_token || activeSessionToken;
                }
            }
            await uploadFile(file, activeSessionToken || sessionToken || true);
        } catch (err) {
            showError(err.message || "Upload failed");
        }
    }, [sessionToken, ensureTurnstileToken, initSession, uploadFile, showError, showSuccess]);

    const handleFilesUpload = useCallback(async (files) => {
        const list = Array.from(files || []).filter(Boolean);
        if (!list.length) return;
        if (uploadingBatchRef.current) return;

        uploadingBatchRef.current = true;
        try {
            for (const file of list) {
                await handleFileUpload(file);
            }
            showSuccess(`${list.length} file${list.length > 1 ? 's' : ''} uploaded.`);
        } finally {
            uploadingBatchRef.current = false;
        }
    }, [handleFileUpload, showSuccess]);

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length) {
            await handleFilesUpload(files);
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
                    onFilesSelect={handleFilesUpload}
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
                                onFilesSelect={handleFilesUpload}
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

            <div
                id="turnstile-widget"
                className={`fixed bottom-4 right-4 z-[9999] ${showTurnstile ? 'block' : 'hidden'}`}
            />
        </div>
    );
}

function Gatekeeper() {
    const { setIsInitializing } = useApp();
    const { checkSession } = useApi();
    const [booting, setBooting] = useState(true);
    const [bootError, setBootError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const hasSession = await checkSession();
                if (cancelled) return;
                if (!hasSession) {
                    // Session is now initialized lazily on first upload after captcha.
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
    }, [checkSession, setIsInitializing]);

    if (booting) return null;

    if (bootError) {
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

        if (!window.turnstile && !document.getElementById('cf-turnstile-script')) {
            const script = document.createElement('script');
            script.id = 'cf-turnstile-script';
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    }, []);

    return (
        <ConfigProvider>
            <AppProvider>
                <Gatekeeper />
            </AppProvider>
        </ConfigProvider>
    );
}



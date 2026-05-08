import React, { useState, useRef, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
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
    const { addFile } = useApp();
    useLocalStorage();

    const [dragActive, setDragActive] = useState(false);
    const sidebarRef = useRef(null);
    const [activeMobileTab, setActiveMobileTab] = useState('files');
    const uploadingBatchRef = useRef(false);

    // When a file is ready, add it to app state
    const onFileReady = useCallback((fileData) => {
        addFile(fileData);
    }, [addFile]);

    const { uploadFile, isUploading, uploadProgress } = useFileUpload(showSuccess, showError);

    const handleFileUpload = useCallback(async (file) => {
        if (!file) return;
        await uploadFile(file, { onFileReady });
    }, [uploadFile, onFileReady]);

    const handleFilesUpload = useCallback(async (files) => {
        const list = Array.from(files || []).filter(Boolean);
        if (!list.length || uploadingBatchRef.current) return;
        uploadingBatchRef.current = true;
        try {
            for (const file of list) {
                await handleFileUpload(file);
            }
        } finally {
            uploadingBatchRef.current = false;
        }
    }, [handleFileUpload]);

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length) await handleFilesUpload(files);
    };

    return (
        <div
            className="flex flex-col h-dvh bg-grid relative"
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setDragActive(false);
            }}
            onDrop={handleDrop}
        >
            <Notification notification={notification} />
            <DragDropOverlay active={dragActive} />

            {/* Desktop */}
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

            {/* Mobile */}
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
        </div>
    );
}

export default function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}

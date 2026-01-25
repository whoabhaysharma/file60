import React from 'react';
import { Sidebar } from './Sidebar.jsx';
import { FileGrid } from './FileGrid.jsx';
import { Resizer } from './Resizer.jsx';
import { MobileHeader } from './MobileHeader.jsx';
import { BottomNav } from './BottomNav.jsx';
import { FileUploadZone } from './FileUploadZone.jsx';
import { CodeEditor } from './CodeEditor.jsx';

export function Dashboard({
    sidebarRef,
    handleFileUpload,
    isUploading,
    uploadProgress,
    activeMobileTab,
    setActiveMobileTab
}) {
    return (
        <>
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
        </>
    );
}

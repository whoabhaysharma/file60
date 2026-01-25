import React, { useState, forwardRef } from 'react';
import { FileUploadZone } from './FileUploadZone.jsx';
import { CodeEditor } from './CodeEditor.jsx';

export const Sidebar = forwardRef(({ onFileSelect, isUploading, uploadProgress }, ref) => {
    const [mode, setMode] = useState('upload');

    return (
        <aside
            ref={ref}
            className="sidebar w-full md:w-[480px] border-b-[4px] md:border-b-0 border-black bg-[#e5e5e5] p-6 flex flex-col shrink-0"
        >
            <h1 className="font-black text-[4rem] leading-[0.7] tracking-tighter mb-4 -skew-x-6">
                FILE<br />60.
            </h1>

            <div className="flex border-[4px] border-black mb-6 shadow-brutal bg-black shrink-0">
                <button
                    onClick={() => setMode('upload')}
                    className={`flex-1 py-3 font-black text-xs uppercase border-r-[4px] border-black transition-all ${mode === 'upload'
                        ? 'bg-accent text-black'
                        : 'bg-black text-white'
                        }`}
                >
                    DUMP TRASH
                </button>
                <button
                    onClick={() => setMode('code')}
                    className={`flex-1 py-3 font-black text-xs uppercase transition-all ${mode === 'code'
                        ? 'bg-accent text-black'
                        : 'bg-black text-white'
                        }`}
                >
                    SPAGHETTI CODE
                </button>
            </div>

            {mode === 'upload' ? (
                <div className="flex flex-col flex-grow min-h-0 overflow-y-auto custom-scroll">
                    <FileUploadZone
                        onFileSelect={onFileSelect}
                        isUploading={isUploading}
                        uploadProgress={uploadProgress}
                    />
                </div>
            ) : (
                <div className="flex flex-col flex-grow min-h-0">
                    <CodeEditor
                        onUpload={onFileSelect}
                        isUploading={isUploading}
                        uploadProgress={uploadProgress}
                    />
                </div>
            )}

        </aside>
    );
});

Sidebar.displayName = 'Sidebar';

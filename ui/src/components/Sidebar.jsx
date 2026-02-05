import React, { useState, forwardRef } from 'react';
import { FileUploadZone } from './FileUploadZone.jsx';
import { CodeEditor } from './CodeEditor.jsx';

export const Sidebar = forwardRef(({ onFileSelect, isUploading, uploadProgress }, ref) => {
    const [mode, setMode] = useState('upload');

    return (
        <aside
            ref={ref}
            className="sidebar w-full md:w-[480px] border-b-[6px] md:border-b-0 border-ink bg-bg p-6 flex flex-col shrink-0"
        >
            <h1 className="font-black text-[3.5rem] leading-[0.8] tracking-tighter mb-4 -skew-x-6 text-ink">
                FILE<span className="text-accent">60</span><span className="animate-pulse">_</span>
            </h1>
            <a href="/?stay=true" className="mb-6 text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 text-ink hover:text-accent transition-all">
                &lt; SYSTEM_HOME
            </a>

            <div className="flex gap-4 mb-6 shrink-0">
                <button
                    onClick={() => setMode('upload')}
                    className={`flex-1 py-3 font-black text-xs uppercase border-[6px] border-ink transition-all shadow-brutal hover:shadow-brutal-sm hover:translate-x-[4px] hover:translate-y-[4px] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none ${mode === 'upload'
                        ? 'bg-accent text-black'
                        : 'bg-bg text-ink'
                        }`}
                >
                    DUMP TRASH
                </button>
                <button
                    onClick={() => setMode('code')}
                    className={`flex-1 py-3 font-black text-xs uppercase border-[6px] border-ink transition-all shadow-brutal hover:shadow-brutal-sm hover:translate-x-[4px] hover:translate-y-[4px] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none ${mode === 'code'
                        ? 'bg-accent text-black'
                        : 'bg-bg text-ink'
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

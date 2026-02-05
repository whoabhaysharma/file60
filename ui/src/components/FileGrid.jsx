import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import { FileCard } from './FileCard.jsx';

export function FileGrid() {
    const { files, removeFile } = useApp();

    if (files.length === 0) {
        return (
            <div className="h-full flex items-center justify-center flex-col p-8 opacity-50 select-none">
                <div className="text-[4rem] md:text-[6rem] font-black text-ink/10 -rotate-12 leading-[0.8]">
                    VOID
                </div>
                <div className="text-xl font-bold text-ink mt-8 border-[2px] border-ink px-4 py-2 uppercase bg-bg z-10">
                    No Files Detected
                </div>
            </div>
        );
    }

    return (
        <div
            className="grid gap-10"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
        >
            {files.map(file => (
                <FileCard key={file.id} file={file} onRemove={removeFile} />
            ))}
        </div>
    );
}

import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import { FileCard } from './FileCard.jsx';

export function FileGrid() {
    const { files, removeFile } = useApp();

    if (files.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="text-[5rem] font-black opacity-5 -rotate-6 select-none uppercase mb-4">
                        404: FILES NOT FOUND
                    </div>
                    <div className="text-lg font-bold opacity-30 uppercase">
                        IT'S LONELY OUT HERE IN THE VOID.
                    </div>
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

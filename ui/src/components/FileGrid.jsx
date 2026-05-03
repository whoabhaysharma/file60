import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { FileCard } from './FileCard.jsx';
import { useApi } from '../hooks/useApi.js';

export function FileGrid() {
    const { files, removeFile, updateFile } = useApp();
    const { extendFileExpiry, startExtendAdGate } = useApi();


    if (files.length === 0) {
        return (
            <div className="flex-grow flex items-center justify-center flex-col p-8 opacity-30 select-none">

                <div className="text-xl font-bold text-ink mt-8 px-4 py-2 uppercase z-10">
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

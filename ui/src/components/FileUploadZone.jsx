import React, { useRef } from 'react';
import { useConfig } from '../context/ConfigContext.jsx';
import { useApp } from '../context/AppContext.jsx';

export function FileUploadZone({ onFileSelect, isUploading, uploadProgress }) {
    const fileInputRef = useRef(null);
    const { serverConfig } = useConfig();
    const { isInitializing } = useApp();

    const handleClick = () => {
        // Always allow click to trigger file selection
        // Initialization happens in useFileUpload hook
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`flex-grow min-h-[200px] border-[6px] border-white ${isInitializing
                ? 'bg-gray-300 cursor-wait opacity-80'
                : 'bg-diagonal-green hover:bg-accent cursor-crosshair'
                } transition-all flex flex-col justify-center items-center p-8 relative group shadow-brutal`}
        >
            {isInitializing ? (
                <div className="text-center">
                    <div className="font-black text-2xl uppercase border-[6px] border-black bg-white px-6 py-3 shadow-brutal">
                        INITIALIZING...
                    </div>
                    <p className="mt-4 text-[10px] font-bold opacity-60">
                        VERIFYING HUMANITY, PLEASE WAIT
                    </p>
                </div>
            ) : isUploading ? (
                <div className="text-center w-full">
                    <div className="font-black text-2xl uppercase border-[6px] border-black bg-accent px-6 py-3">
                        STEALING WIFI...
                    </div>
                    <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <div className="upload-info">
                        <div className="font-black">{Math.round(uploadProgress)}%</div>
                    </div>
                </div>
            ) : (
                <div className="text-center">
                    <div className="font-black text-2xl uppercase border-[6px] border-black bg-white px-6 py-3 shadow-brutal group-hover:shadow-none transition-all">
                        FEED ME FILES
                    </div>
                    <p className="mt-6 text-[10px] font-bold tracking-widest leading-relaxed text-white">
                        TOP SECRET / SPICY MEMES / EVIDENCE
                    </p>
                    <p className="mt-2 text-[8px] opacity-60 font-bold uppercase text-white">
                        DROP IT LIKE IT'S HOT (OR NOT, I'M JUST A DIV)
                    </p>
                    <p className="mt-1 text-[8px] opacity-40 font-bold uppercase text-white">
                        Max size: {serverConfig.maxFileSizeMB}MB
                    </p>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={isInitializing}
            />
        </div>
    );
}

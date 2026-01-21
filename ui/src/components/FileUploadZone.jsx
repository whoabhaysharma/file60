import React, { useRef } from 'react';
import { useConfig } from '../context/ConfigContext.jsx';

export function FileUploadZone({ onFileSelect, isUploading, uploadProgress }) {
    const fileInputRef = useRef(null);
    const { serverConfig } = useConfig();

    const handleClick = () => {
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
            className="flex-grow min-h-[200px] border-[4px] border-black bg-diagonal-green hover:bg-accent transition-all cursor-crosshair flex flex-col justify-center items-center p-8 relative group shadow-brutal"
        >
            {isUploading ? (
                <div className="text-center w-full">
                    <div className="font-black text-2xl uppercase border-[4px] border-black bg-accent px-6 py-3">
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
                    <div className="font-black text-2xl uppercase border-[4px] border-black bg-white px-6 py-3 shadow-brutal group-hover:shadow-none transition-all">
                        FEED ME FILES
                    </div>
                    <p className="mt-6 text-[10px] font-bold tracking-widest leading-relaxed">
                        TOP SECRET / SPICY MEMES / EVIDENCE
                    </p>
                    <p className="mt-2 text-[8px] opacity-60 font-bold uppercase">
                        DROP IT LIKE IT'S HOT (OR NOT, I'M JUST A DIV)
                    </p>
                    <p className="mt-1 text-[8px] opacity-40 font-bold uppercase">
                        Max size: {serverConfig.maxFileSizeMB}MB
                    </p>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}

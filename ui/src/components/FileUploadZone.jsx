import React from 'react';
import { useConfig } from '../context/ConfigContext.jsx';

export function FileUploadZone({ onFileSelect, isUploading, uploadProgress }) {
    const { serverConfig } = useConfig();

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) onFileSelect(e.target.files[0]);
    };

    return (
        /* SINGLE CONTAINER: Fills 100% W/H and uses your exact sidebar animation classes */
        <label
            className={`
                w-full h-full flex flex-col items-center justify-center p-12
                border-[6px] border-ink bg-bg cursor-pointer select-none
                ${isUploading ? 'bg-accent cursor-wait' : ''}
            `}
        >
            <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
            />

            {isUploading ? (
                <div className="w-full text-center">
                    <h2 className="font-black text-4xl uppercase mb-6 italic text-black">Sending</h2>
                    <div className="w-full border-[6px] border-ink bg-bg h-16 relative overflow-hidden">
                        <div
                            className="h-full bg-ink transition-all duration-300"
                            style={{ width: `${uploadProgress}% ` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-accent mix-blend-difference">
                            {Math.round(uploadProgress)}%
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Primary Label Block - Matches screenshot styling */}
                    <div className="bg-ink text-bg px-8 py-10 mb-8 w-full max-w-[280px] border-[4px] border-ink">
                        <h2 className="font-black text-[2.8rem] leading-[0.85] uppercase tracking-tighter text-center">
                            Feed Me<br />Files
                        </h2>
                    </div>

                    <p className="font-black text-lg uppercase tracking-widest text-ink mb-6">
                        Drop Files or Click
                    </p>

                    <div className="border-[2px] border-ink px-4 py-1 font-bold text-[10px] uppercase text-ink">
                        Max: {serverConfig?.maxFileSizeMB || 100}MB
                    </div>
                </>
            )}
        </label>
    );
}
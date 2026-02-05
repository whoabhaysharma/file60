import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatRemainingTime, calculateTimePercentage } from '../utils/time.js';

export function FileCard({ file, onRemove }) {
    const [timeDisplay, setTimeDisplay] = useState('Calculating...');
    const [timePercentage, setTimePercentage] = useState(100);

    useEffect(() => {
        if (file.expires === 'never') {
            setTimeDisplay('IMMORTAL');
            return;
        }

        const updateTimer = () => {
            const now = Date.now();
            const remaining = file.expires - now;

            if (remaining <= 0) {
                onRemove(file.id);
                return;
            }

            const pct = calculateTimePercentage(file.created, file.expires, now);
            setTimePercentage(pct);
            setTimeDisplay(formatRemainingTime(remaining));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [file, onRemove]);

    const handleCopy = async (e) => {
        try {
            await navigator.clipboard.writeText(file.url);
            const button = e.target;
            const originalText = button.innerText;
            button.innerText = 'YOINKED!';
            setTimeout(() => {
                button.innerText = originalText;
            }, 1000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const isImage = file.type.startsWith('image');
    const ext = file.name.split('.').pop();

    return (
        <div className="bg-bg border-[6px] border-ink shadow-brutal p-5 flex flex-col gap-5 transition-transform hover:-translate-y-1">
            <div className="relative aspect-video bg-bg border-[4px] border-bg overflow-hidden scanlines flex items-center justify-center">
                <div className="absolute top-3 left-3 z-10 bg-accent border-[2px] border-bg px-2 py-0.5 text-xs font-black uppercase text-black">
                    {ext}
                </div>
                {isImage ? (
                    <img className="w-full h-full object-cover" src={file.url} loading="lazy" alt={file.name} />
                ) : (
                    <div className="text-accent text-center p-6 font-bold text-sm break-all uppercase tracking-tighter">
                        {file.name}
                    </div>
                )}
            </div>
            <div className="flex gap-3">
                <button
                    onClick={handleCopy}
                    className="flex-grow bg-accent text-black border-[4px] border-bg py-4 font-black text-sm uppercase transition-all shadow-brutal hover:shadow-brutal-sm hover:translate-x-[4px] hover:translate-y-[4px] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none"
                >
                    COPY LINK
                </button>
                <button
                    onClick={() => onRemove(file.id)}
                    className="bg-alert text-white border-[4px] border-bg px-6 py-4 font-black transition-all shadow-brutal hover:shadow-brutal-sm hover:translate-x-[4px] hover:translate-y-[4px] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none"
                >
                    ×
                </button>
            </div>
            <div className="border-[4px] border-bg h-6 bg-terminal relative overflow-hidden">
                <div
                    className="h-full bg-bg transition-all duration-1000"
                    style={{ width: `${timePercentage}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black mix-blend-difference text-white uppercase">
                    {timeDisplay}
                </div>
            </div>
        </div>
    );
}

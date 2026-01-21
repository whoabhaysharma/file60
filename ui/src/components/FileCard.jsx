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
        <div className="bg-white border-[4px] border-black shadow-brutal p-5 flex flex-col gap-5">
            <div className="relative aspect-video bg-black border-[3px] border-black overflow-hidden scanlines flex items-center justify-center">
                <div className="absolute top-3 left-3 z-10 bg-accent border-[2px] border-black px-2 py-0.5 text-xs font-black uppercase text-black">
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
                    className="active-press flex-grow bg-accent text-black border-[3px] border-black py-4 font-black text-sm shadow-brutal-sm uppercase"
                >
                    COPY LINK
                </button>
                <button
                    onClick={() => onRemove(file.id)}
                    className="active-press bg-alert text-white border-[3px] border-black px-6 py-4 font-black shadow-brutal-sm"
                >
                    ×
                </button>
            </div>
            <div className="border-[3px] border-black h-6 bg-[#eee] relative overflow-hidden">
                <div
                    className="h-full bg-black transition-all duration-1000"
                    style={{ width: `${timePercentage}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black mix-blend-difference text-white uppercase">
                    {timeDisplay}
                </div>
            </div>
        </div>
    );
}

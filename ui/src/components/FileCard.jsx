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
            button.innerText = 'COPIED!';
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
        <div className="bg-bg border-[6px] border-ink p-5 flex flex-col gap-5">
            {/* Header / Thumb */}
            <div className="relative aspect-video bg-terminal border-[4px] border-ink overflow-hidden flex items-center justify-center">
                <div className="absolute top-2 left-2 z-10 bg-accent border-[2px] border-black px-2 py-0.5 text-xs font-black uppercase text-black shadow-brutal-sm">
                    {ext}
                </div>
                {isImage ? (
                    <img className="w-full h-full object-cover" src={file.url} loading="lazy" alt={file.name} />
                ) : (
                    <div className="text-accent text-center p-6 font-black text-sm break-all uppercase tracking-tighter">
                        {file.name}
                    </div>
                )}
            </div>

            {/* Brutalist Actions Row */}
            <div className="flex gap-4">
                <button
                    onClick={handleCopy}
                    className="flex-grow bg-accent text-black border-[4px] border-ink py-3 font-black text-xs uppercase transition-all shadow-brutal hover:shadow-brutal-sm hover:translate-x-[4px] hover:translate-y-[4px] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none"
                >
                    COPY LINK
                </button>
                <button
                    onClick={() => onRemove(file.id)}
                    className="w-16 bg-alert text-white border-[4px] border-ink font-black text-xl flex items-center justify-center transition-all shadow-brutal hover:shadow-brutal-sm hover:translate-x-[4px] hover:translate-y-[4px] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none"
                >
                    ×
                </button>
            </div>

            {/* Progress Bar */}
            <div className="border-[4px] border-ink h-6 bg-terminal relative overflow-hidden">
                <div
                    className="h-full bg-accent transition-all duration-1000 ease-linear"
                    style={{ width: `${timePercentage}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black mix-blend-difference text-white uppercase tracking-widest">
                    {timeDisplay}
                </div>
            </div>
        </div>
    );
}

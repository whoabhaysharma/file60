import React, { useEffect, useRef, useState } from 'react';

const AD_WAIT_SECONDS = 30;

export function AdGateModal({ isOpen, isSubmitting, waitSeconds = AD_WAIT_SECONDS, onClose, onConfirm }) {
    const adContainerRef = useRef(null);
    const [secondsLeft, setSecondsLeft] = useState(waitSeconds);
    const [adUnlocked, setAdUnlocked] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setSecondsLeft(waitSeconds);
        setAdUnlocked(false);
    }, [isOpen, waitSeconds]);

    useEffect(() => {
        if (!isOpen || adUnlocked) return;

        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setAdUnlocked(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen, adUnlocked]);

    useEffect(() => {
        if (!isOpen || !adContainerRef.current) return;

        adContainerRef.current.innerHTML = '';
        window.atOptions = {
            key: 'bacfcdd260ae9454336c227461f3869d',
            format: 'iframe',
            height: 90,
            width: 728,
            params: {}
        };

        const script = document.createElement('script');
        script.src = 'https://www.highperformanceformat.com/bacfcdd260ae9454336c227461f3869d/invoke.js';
        script.async = true;
        adContainerRef.current.appendChild(script);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
            <div className="w-[760px] max-w-[calc(100vw-2rem)] border-[6px] border-ink bg-bg shadow-brutal p-5 flex flex-col gap-4 overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm md:text-base font-black uppercase text-ink">Watch Ad To Extend 24H</h3>
                        <p className="text-xs font-bold uppercase text-ink/70 mt-1">
                            Extension unlocks after ad gate timer completes.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="border-[3px] border-ink px-2 py-1 text-xs font-black uppercase bg-bg text-ink disabled:opacity-50"
                    >
                        Close
                    </button>
                </div>

                <div className="border-[4px] border-ink bg-terminal w-[728px] h-[90px] overflow-hidden shrink-0">
                    <div ref={adContainerRef} className="w-[728px] h-[90px]" />
                </div>

                <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-black uppercase text-ink">
                        {adUnlocked ? 'Ad gate unlocked' : `Unlocking in ${secondsLeft}s`}
                    </div>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!adUnlocked || isSubmitting}
                        className="border-[4px] border-ink bg-accent text-black px-4 py-2 text-xs font-black uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Extending...' : 'Extend 24H'}
                    </button>
                </div>
            </div>
        </div>
    );
}


import React, { useState, useEffect } from 'react';

export function AdsDisclaimerModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasSeenDisclaimer = localStorage.getItem('file60_ads_disclaimer_seen');
        if (!hasSeenDisclaimer) {
            // Small delay to not overwhelm on immediate load
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('file60_ads_disclaimer_seen', 'true');
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-bg border-[6px] border-ink shadow-brutal p-8 max-w-md w-full relative flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-500">
                {/* Header */}
                <div className="border-b-[4px] border-ink pb-4">
                    <h2 className="font-black text-3xl uppercase text-ink leading-none">
                        Beta Testing <span className="text-accent">Ads</span>
                    </h2>
                </div>

                {/* Content */}
                <div className="font-mono text-sm leading-relaxed text-ink/80">
                    <p className="mb-4">
                        We are currently experimenting with ads to help keep the platform free and sustainable.
                    </p>
                    <p>
                        It might feel a little clunky at first, but we are working hard to make the integration seamless and non-intrusive. Appreciate you sticking with us while we calibrate the experience.
                    </p>
                </div>

                {/* Action */}
                <button
                    onClick={handleClose}
                    className="w-full bg-accent text-black border-[4px] border-ink py-4 font-black text-sm uppercase transition-all shadow-brutal hover:shadow-brutal-sm hover:translate-x-[4px] hover:translate-y-[4px] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none"
                >
                    Understood
                </button>
            </div>
        </div>
    );
}

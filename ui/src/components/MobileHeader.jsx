import React from 'react';

export function MobileHeader() {
    return (
        <header className="h-16 border-b-[4px] border-white bg-black flex items-center justify-center shrink-0">
            <a href="/?stay=true" className="font-black text-2xl tracking-tighter -skew-x-6">
                FILE<span className="text-accent">60</span><span className="animate-pulse">_</span>
            </a>
        </header>
    );
}

import React from 'react';

export function DragDropOverlay({ active }) {
    return (
        <div className={`drop-overlay ${active ? 'active pointer-events-auto' : 'pointer-events-none'}`}>
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {/* Rotating Rings */}
                <div className="absolute w-[600px] h-[600px] border-[2px] border-dashed border-accent/20 rounded-full animate-spin-slow" />
                <div className="absolute w-[400px] h-[400px] border-[2px] border-accent/40 rounded-full animate-spin-reverse" />
                <div className="absolute w-[200px] h-[200px] border-[4px] border-accent rounded-full animate-pulse-fast" />

                {/* Corner Brackets */}
                <div className="absolute top-10 left-10 w-24 h-24 border-t-[8px] border-l-[8px] border-white" />
                <div className="absolute top-10 right-10 w-24 h-24 border-t-[8px] border-r-[8px] border-white" />
                <div className="absolute bottom-10 left-10 w-24 h-24 border-b-[8px] border-l-[8px] border-white" />
                <div className="absolute bottom-10 right-10 w-24 h-24 border-b-[8px] border-r-[8px] border-white" />

                {/* Crosshairs */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-accent/30" />
                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-accent/30" />

                <div className="text-center z-10 bg-black/80 p-12 border-[2px] border-accent backdrop-blur-md">
                    <div className="font-black text-8xl mb-2 uppercase tracking-tighter text-white drop-shadow-[4px_4px_0_rgba(0,255,65,1)]">
                        DROP IT
                    </div>
                    <div className="font-mono text-xl text-accent uppercase tracking-[0.5em] animate-pulse">
                        &gt;&gt; INITIATING DATA LINK &lt;&lt;
                    </div>
                </div>
            </div>
        </div>
    );
}

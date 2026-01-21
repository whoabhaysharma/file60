import React from 'react';

export function DragDropOverlay({ active }) {
    return (
        <div className={`drop-overlay ${active ? 'active' : ''}`}>
            <div className="drop-zone-full">
                <div className="text-center text-white">
                    <div className="font-black text-6xl mb-4 uppercase tracking-wider text-accent">
                        INCOMING!
                    </div>
                    <div className="font-bold text-xl uppercase tracking-wide mb-2">
                        PREPARE FOR IMPACT
                    </div>
                    <div className="bg-accent text-black px-4 py-2 border-4 border-white font-black text-sm uppercase">
                        INITIATING TRANSFER PROTOCOL
                    </div>
                </div>
            </div>
        </div>
    );
}

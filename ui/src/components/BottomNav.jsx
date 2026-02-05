import React from 'react';

export function BottomNav({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'files', label: 'FILES' },
        { id: 'upload', label: 'UPLOAD' },
        { id: 'code', label: 'CODE' }
    ];

    return (
        <nav className="h-16 border-t-[6px] border-ink flex shrink-0 bg-bg text-xs font-black uppercase">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex-1 flex items-center justify-center transition-all border-r-[3px] border-ink last:border-r-0 ${activeTab === tab.id
                        ? 'bg-accent text-black'
                        : 'bg-bg text-ink hover:bg-ink/10'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    );
}

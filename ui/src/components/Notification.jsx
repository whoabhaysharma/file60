import React from 'react';

export function Notification({ notification }) {
    if (!notification) return null;

    const { message, type, visible } = notification;
    const bgClass = type === 'error' ? 'bg-alert' : 'bg-accent';

    return (
        <div className={`notification-box fixed top-20 md:top-14 left-1/2 z-[100] w-[90%] max-w-md pointer-events-none ${visible ? 'visible' : ''}`}>
            <div className={`${bgClass} border-[4px] border-black p-4 shadow-brutal flex items-start gap-4`}>
                <div className="bg-black text-white px-2 py-1 text-xs font-black uppercase">
                    SYSTEM_MSG
                </div>
                <div className="text-sm font-bold uppercase leading-tight pt-1">
                    {message}
                </div>
            </div>
        </div>
    );
}

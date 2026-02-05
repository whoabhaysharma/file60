import React, { useEffect, useRef, useState } from 'react';

export function AdBanner() {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        // Handle responsive scaling for the fixed-size ad
        const handleResize = () => {
            if (containerRef.current) {
                const parentWidth = containerRef.current.parentElement?.offsetWidth || window.innerWidth;
                const adWidth = 728;
                // Add some padding/buffer
                const availableWidth = parentWidth - 32;

                if (availableWidth < adWidth) {
                    setScale(availableWidth / adWidth);
                } else {
                    setScale(1);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [showAdBlockMessage, setShowAdBlockMessage] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Hunting for an ad you'll probably ignore...");

    const loadingMessages = [
        "Hunting for an ad you'll probably ignore...",
        "Telling the internet to wake up...",
        "Hiding your phone number from loan agents...",
        "Asking a brand to pay for your free visit...",
        "Finding some loose change for the servers..."
    ];

    useEffect(() => {
        // Rotate loading messages
        let messageIndex = 0;
        const messageTimer = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            setLoadingMessage(loadingMessages[messageIndex]);
        }, 800);

        // Delay showing the ad-block message to give the ad time to load
        const timer = setTimeout(() => {
            setShowAdBlockMessage(true);
            clearInterval(messageTimer);
        }, 4000);

        return () => {
            clearTimeout(timer);
            clearInterval(messageTimer);
        };
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clear previous content
        const adContainer = containerRef.current.querySelector('.ad-frame-container');
        if (!adContainer) return;

        adContainer.innerHTML = '';

        const iframe = document.createElement('iframe');
        iframe.style.width = '728px';
        iframe.style.height = '90px';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        iframe.scrolling = "no";
        iframe.title = "Advertisement";

        adContainer.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; overflow: hidden; background: transparent; }
                </style>
            </head>
            <body>
                <script type="text/javascript">
                    atOptions = {
                        'key' : 'bacfcdd260ae9454336c227461f3869d',
                        'format' : 'iframe',
                        'height' : 90,
                        'width' : 728,
                        'params' : {}
                    };
                </script>
                <script type="text/javascript" src="https://www.highperformanceformat.com/bacfcdd260ae9454336c227461f3869d/invoke.js"></script>
            </body>
            </html>
        `);
        doc.close();

    }, []);

    return (
        <div
            ref={containerRef}
            className="flex flex-col items-center justify-center my-4 w-full text-center relative pointer-events-auto"
        >
            {/* styled wrapper */}
            <div
                className="relative bg-bg border-2 border-dashed border-ink/20 p-2 overflow-hidden transition-all hover:border-accent/40 group"
                style={{
                    width: '750px', // slightly larger than ad
                    height: '112px', // enough for ad + padding
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center'
                }}
            >
                {/* Fallback / Creative Background */}
                {/* Fallback / Creative Background */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-0 opacity-50 group-hover:opacity-80 transition-opacity p-4">
                    {showAdBlockMessage ? (
                        <>
                            <p className="font-bold text-sm text-ink/60 mb-1">
                                Your ad-blocker is doing a great job. BTW.
                            </p>
                            <p className="text-xs text-ink/40 max-w-md leading-relaxed">
                                Respect. But if you ever feel like turning it off,
                                <br />
                                our servers would appreciate the <span className="italic">shagun</span>.
                            </p>
                        </>
                    ) : (
                        <div className="flex flex-col items-center animate-pulse">
                            <p className="font-bold text-xs uppercase tracking-widest text-ink/30 mb-1 w-64">
                                {loadingMessage}
                            </p>
                            <div className="w-16 h-1 bg-ink/10 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-accent/50 w-full animate-progress-indeterminate"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Ad Container */}
                <div className="ad-frame-container relative z-10 flex justify-center items-center h-full w-full">
                    {/* iframe injected here */}
                </div>
            </div>

            {/* Bottom Caption */}
            <div className="mt-3 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-help" title="Just keeping things running.">
                <p className="text-[9px] font-medium text-ink/40 text-center max-w-xs">
                    (We show ads so we don't have to sell your data to peter.)
                </p>
            </div>
        </div>
    );
}

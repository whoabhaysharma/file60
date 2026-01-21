import React, { useState, useRef, useEffect } from 'react';

export function Resizer({ sidebarRef }) {
    const [isResizing, setIsResizing] = useState(false);
    const resizerRef = useRef(null);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing || !sidebarRef.current) return;

            const newWidth = startWidthRef.current + (e.clientX - startXRef.current);
            const minWidth = 300;
            const maxWidth = window.innerWidth * 0.7;

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                sidebarRef.current.style.width = `${newWidth}px`;
            }
        };

        const handleMouseUp = () => {
            if (isResizing) {
                setIsResizing(false);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, sidebarRef]);

    const handleMouseDown = (e) => {
        if (!sidebarRef.current) return;

        setIsResizing(true);
        startXRef.current = e.clientX;
        startWidthRef.current = sidebarRef.current.getBoundingClientRect().width;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    return (
        <div
            ref={resizerRef}
            className={`resizer ${isResizing ? 'resizing' : ''}`}
            onMouseDown={handleMouseDown}
        />
    );
}

/**
 * Sub-component for the Turnstile Widget
 * Handles initialization and cleanup properly via Refs
 */
const TurnstileCaptcha = ({ onVerify, theme = 'light' }) => {
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);

    useEffect(() => {
        const siteKey = (window.APP_CONFIG && window.APP_CONFIG.TURNSTILE_SITE_KEY) || import.meta.env.VITE_TURNSTILE_SITE_KEY;

        const renderWidget = () => {
            if (window.turnstile && containerRef.current && !widgetIdRef.current) {
                widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    theme: theme,
                    callback: (token) => onVerify(token),
                    'expired-callback': () => onVerify(null),
                    'error-callback': () => onVerify(null),
                });
            }
        };

        if (window.turnstile) {
            renderWidget();
        } else {
            window.onloadTurnstileCallback = renderWidget;
        }

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [onVerify, theme]);

    return <div ref={containerRef} className="min-h-[65px] flex justify-center items-center" />;
};

export default TurnstileCaptcha;

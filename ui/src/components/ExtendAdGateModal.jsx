import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '../hooks/useApi.js';

const AD_INVOKE_SRC =
    'https://www.highperformanceformat.com/bacfcdd260ae9454336c227461f3869d/invoke.js';

/**
 * Mandatory ad + countdown before extend. Server still enforces JWT `readyAt` — cannot bypass by calling the API early.
 */
export function ExtendAdGateModal({ open, fileId, onSuccess, onError, onClose }) {
    const { startAdGate, extendFile } = useApi();
    const adHostRef = useRef(null);
    const autoExtendStartedRef = useRef(false);
    const [phase, setPhase] = useState('idle'); // idle | loading | ready | extending | error
    const [errorMsg, setErrorMsg] = useState('');
    const [adGateToken, setAdGateToken] = useState(null);
    const [waitSeconds, setWaitSeconds] = useState(30);
    const [secondsLeft, setSecondsLeft] = useState(30);

    const openRef = useRef(open);
    const phaseRef = useRef(phase);
    openRef.current = open;
    phaseRef.current = phase;

    const reset = useCallback(() => {
        autoExtendStartedRef.current = false;
        setPhase('idle');
        setErrorMsg('');
        setAdGateToken(null);
        setWaitSeconds(30);
        setSecondsLeft(30);
        if (adHostRef.current) adHostRef.current.innerHTML = '';
    }, []);

    useEffect(() => {
        if (!open) {
            reset();
            return;
        }

        let cancelled = false;
        (async () => {
            setPhase('loading');
            setErrorMsg('');
            try {
                const data = await startAdGate(fileId);
                if (cancelled) return;
                const token = data.ad_gate_token;
                const wait = Number(data.wait_seconds) || 30;
                if (!token) throw new Error('Missing ad gate token from server');
                setAdGateToken(token);
                setWaitSeconds(wait);
                setSecondsLeft(wait);
                setPhase('ready');
            } catch (e) {
                if (!cancelled) {
                    setPhase('error');
                    setErrorMsg(e?.message || 'Could not start extend flow');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, fileId, startAdGate, reset]);

    useEffect(() => {
        if (!open || phase !== 'ready' || !adHostRef.current) return;

        const host = adHostRef.current;
        host.innerHTML = '';
        const opts = document.createElement('script');
        opts.textContent = `atOptions = {
  'key' : 'bacfcdd260ae9454336c227461f3869d',
  'format' : 'iframe',
  'height' : 90,
  'width' : 728,
  'params' : {}
};`;
        const inv = document.createElement('script');
        inv.src = AD_INVOKE_SRC;
        inv.async = true;
        host.appendChild(opts);
        host.appendChild(inv);

        return () => {
            host.innerHTML = '';
        };
    }, [open, phase]);

    useEffect(() => {
        if (!open || phase !== 'ready') return;
        setSecondsLeft(waitSeconds);
        const id = setInterval(() => {
            setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
        }, 1000);
        return () => clearInterval(id);
    }, [open, phase, waitSeconds]);

    useEffect(() => {
        if (!open || !adGateToken || secondsLeft > 0) return;
        if (phaseRef.current !== 'ready') return;
        if (autoExtendStartedRef.current) return;
        autoExtendStartedRef.current = true;

        setPhase('extending');

        (async () => {
            try {
                const res = await extendFile(fileId, adGateToken);
                if (!openRef.current) return;
                onSuccess?.(res);
                reset();
                onClose?.();
            } catch (e) {
                if (!openRef.current) return;
                autoExtendStartedRef.current = false;
                setPhase('error');
                setErrorMsg(e?.message || 'Extend failed');
                onError?.(e);
            }
        })();
    }, [open, secondsLeft, adGateToken, fileId, extendFile, onSuccess, onError, onClose, reset]);

    const canDismissDialog = true; // Allow closing anytime to prevent getting stuck

    const handleBackdropPointerDown = (e) => {
        if (e.target === e.currentTarget && canDismissDialog) {
            onClose?.();
            reset();
        }
    };

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape' && canDismissDialog) {
                onClose?.();
                reset();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, canDismissDialog, onClose, reset]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-4"
            onMouseDown={handleBackdropPointerDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="extend-ad-title"
        >
            <div
                className="max-w-3xl w-full border-[6px] border-ink bg-bg shadow-brutal p-6 flex flex-col gap-4"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <h2 id="extend-ad-title" className="text-lg font-black uppercase text-ink">
                    Extend storage — watch sponsor
                </h2>
                <p className="text-xs font-bold text-ink/80 uppercase">
                    After {waitSeconds} seconds your storage extends automatically. You can close this dialog only if an
                    error is shown.
                </p>

                {phase === 'loading' && (
                    <p className="text-sm font-black uppercase text-accent">Loading ad gate…</p>
                )}

                {phase === 'error' && (
                    <p className="text-sm font-black uppercase text-alert">{errorMsg}</p>
                )}

                {(phase === 'ready' || phase === 'extending') && (
                    <>
                        <div
                            ref={adHostRef}
                            className="min-h-[100px] border-[4px] border-ink bg-terminal flex items-center justify-center overflow-hidden"
                        />
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="text-2xl font-black tabular-nums">
                                {phase === 'extending'
                                    ? 'EXTENDING…'
                                    : secondsLeft > 0
                                      ? `${secondsLeft}s`
                                      : 'APPLYING…'}
                            </div>
                        </div>
                    </>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            reset();
                            onClose?.();
                        }}
                        className="px-4 py-2 border-[4px] border-ink font-black text-xs uppercase hover:bg-ink hover:text-bg transition-colors"
                    >
                        {phase === 'error'
                            ? 'CLOSE'
                            : phase === 'extending'
                              ? 'EXTENDING…'
                              : 'CANCEL'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * useApi.js — Thin hook wrapper around api.js for React components.
 * Use the functions from api.js directly when possible.
 */
import { useCallback } from 'react';
import { initSession, startAdGate, extendFile } from '../api.js';

export function useApi() {
    const initSessionFn = useCallback(() => initSession(), []);
    const startAdGateFn = useCallback((fileId) => startAdGate(fileId), []);
    const extendFileFn = useCallback((id, token) => extendFile(id, token), []);

    return {
        initSession: initSessionFn,
        startAdGate: startAdGateFn,
        extendFile: extendFileFn,
    };
}

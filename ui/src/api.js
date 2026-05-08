/**
 * api.js — Simple, self-contained API client for File60.
 *
 * Session token is stored in localStorage and sent as `x-session-token`.
 * This is cross-origin safe unlike cookies between different subdomains.
 */

const TOKEN_KEY = 'file60_token';
const API_URL = (() => {
    const runtime = window.APP_CONFIG?.API_URL;
    const env = import.meta.env.VITE_API_URL;
    return (runtime || env || '').replace(/\/$/, '');
})();

function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
}

function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function authHeaders() {
    const token = getToken();
    return token ? { 'x-session-token': token } : {};
}

async function apiFetch(path, options = {}) {
    const url = `${API_URL}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            ...authHeaders(),
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `Request failed: ${res.status}`);
    }
    return res.json();
}

/**
 * Creates a new session and stores the token in localStorage.
 * Returns the session token.
 */
export async function initSession() {
    const data = await apiFetch('/api/session', { method: 'POST' });
    if (data.session_token) {
        saveToken(data.session_token);
    }
    return data;
}

/**
 * Returns true if the stored token is still valid (simple local check).
 * This doesn't hit the server — just checks if we have a token.
 */
export function hasSession() {
    return !!getToken();
}

/**
 * Returns { id, uploadUrl, expiresAt } for a presigned B2 upload.
 */
export async function getUploadUrl(name, type, size) {
    return apiFetch('/api/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, size }),
    });
}

/**
 * Confirms that a file upload is complete and marks it ready in the DB.
 * Returns the final file record.
 */
export async function confirmUpload(id) {
    return apiFetch('/api/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
    });
}

/**
 * Starts the ad gate timer for a file extension.
 * Returns { ad_gate_token, wait_seconds }.
 */
export async function startAdGate(fileId) {
    return apiFetch(`/api/file/${encodeURIComponent(fileId)}/extend/ad-gate/start`, { method: 'POST' });
}

/**
 * Extends a file's expiry after the ad gate timer has completed.
 */
export async function extendFile(id, adGateToken) {
    return apiFetch('/api/extend-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-ad-gate-token': adGateToken },
        body: JSON.stringify({ id }),
    });
}

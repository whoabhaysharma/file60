// Time Utilities

/**
 * Format remaining time as HH:MM:SS
 */
export function formatRemainingTime(milliseconds) {
    const h = Math.floor(milliseconds / 3600000);
    const m = Math.floor((milliseconds % 3600000) / 60000);
    const s = Math.floor((milliseconds % 60000) / 1000);

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Calculate percentage of time remaining
 */
export function calculateTimePercentage(created, expires, now) {
    const remaining = expires - now;
    const total = expires - created;

    if (remaining <= 0) return 0;
    if (total <= 0) return 100;

    return Math.max(0, (remaining / total) * 100);
}

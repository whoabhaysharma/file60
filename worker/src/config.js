export function getConfig(env) {
    return {
        // Feature Flags & URLs
        R2_PUBLIC_URL: env.R2_PUBLIC_URL || "", // Default to empty, allowing fallback

        // Limits & Quotas
        MAX_FILE_SIZE: parseInt(env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
        RATE_LIMIT_HITS: parseInt(env.RATE_LIMIT_HITS) || 20,
        EXPIRY_MS: parseInt(env.EXPIRY_MS) || 3600000, // 1 hour

        // Storage
        BUCKET_NAME: env.R2_BUCKET_NAME || 'file60-files',

        // Secrets (Explicitly mapped for clarity, though usually accessed directly)
        JWT_SECRET: env.JWT_SECRET,

        // R2 Credentials
        R2: {
            ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
            SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
            ACCOUNT_ID: env.R2_ACCOUNT_ID
        }
    };
}

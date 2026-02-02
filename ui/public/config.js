// Runtime Configuration
// This file is loaded before the application bundle
// and provides configuration that can be changed without rebuilding
// Values here take precedence over .env files

// In ui/public/config.js
window.APP_CONFIG = {
    // Use local worker for localhost, production worker for deployed site
    API_URL: window.location.hostname === 'localhost'
        ? 'https://file60.abhaysharma-as2719.workers.dev'  // Local wrangler dev server
        : 'https://file60.abhaysharma-as2719.workers.dev',
    // Use test key for localhost, real key for production
    TURNSTILE_SITE_KEY: window.location.hostname === 'localhost'
        ? '0x4AAAAAACOKCe1pikeARO-o'  // Test key for local dev
        : '0x4AAAAAACOKCe1pikeARO-o'   // Real key for production
};
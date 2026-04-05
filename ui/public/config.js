// Runtime Configuration
// This file is loaded before the application bundle
// and provides configuration that can be changed without rebuilding
// Values here take precedence over .env files

// In ui/public/config.js
window.APP_CONFIG = {
    // Use local worker for localhost, production worker for deployed site
    API_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:8787'  // Local wrangler dev server
        : 'https://file60.abhaysharma-as2719.workers.dev'
};
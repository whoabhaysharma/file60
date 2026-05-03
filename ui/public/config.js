// Runtime Configuration
// This file is loaded before the application bundle
// and provides configuration that can be changed without rebuilding
// Values here take precedence over .env files

// In ui/public/config.js
window.APP_CONFIG = {
    // Use local Bunny API runtime for localhost, deployed Bunny Edge API otherwise.
    API_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:8787'
        : 'https://api-file60.bythub.in'
};
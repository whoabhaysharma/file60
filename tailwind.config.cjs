/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./ui/**/*.html",
        "./ui/src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: { mono: ['"Courier Prime"', 'monospace'] },
            colors: { bg: '#0a0a0a', core: '#0a0a0a', ink: '#ffffff', accent: '#00ff41', alert: '#ff2a00', terminal: '#1a1a1a' },
            boxShadow: { 'brutal': '8px 8px 0px 0px #ffffff', 'brutal-sm': '4px 4px 0px 0px #ffffff', 'brutal-lg': '12px 12px 0px 0px #ffffff' }
        },
    },
    plugins: [],
}

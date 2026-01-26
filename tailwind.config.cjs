/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./ui/**/*.html",
        "./ui/src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: { mono: ['"Courier Prime"', 'monospace'] },
            colors: { bg: '#d1d1d1', core: '#ffffff', ink: '#000000', accent: '#00ff41', alert: '#ff2a00', terminal: '#121212' },
            boxShadow: { 'brutal': '8px 8px 0px 0px #000', 'brutal-sm': '4px 4px 0px 0px #000', 'brutal-lg': '12px 12px 0px 0px #000' }
        },
    },
    plugins: [],
}

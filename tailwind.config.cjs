/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./ui/**/*.html",
        "./ui/src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: { mono: ['"Courier Prime"', 'monospace'] },
            colors: { bg: '#ffffff', core: '#ffffff', ink: '#050505', accent: '#00ff41', alert: '#ff2a00', terminal: '#f4f4f4' },
            boxShadow: { 'brutal': '8px 8px 0px 0px #000000', 'brutal-sm': '4px 4px 0px 0px #000000', 'brutal-lg': '12px 12px 0px 0px #000000' }
        },
    },
    plugins: [],
}

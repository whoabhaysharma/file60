/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./ui/**/*.html",
        "./ui/src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: { mono: ['"Courier Prime"', 'monospace'] },
            colors: {
                bg: 'var(--color-bg)',
                core: 'var(--color-core)',
                ink: 'var(--color-ink)',
                accent: 'var(--color-accent)',
                alert: 'var(--color-alert)',
                terminal: 'var(--color-terminal)'
            },
            boxShadow: {
                'brutal': 'var(--shadow-brutal)',
                'brutal-sm': 'var(--shadow-brutal-sm)',
                'brutal-lg': 'var(--shadow-brutal-lg)'
            }
        },
    },
    plugins: [],
}

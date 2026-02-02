import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        react({
            jsxRuntime: 'automatic'
        })
    ],
    root: 'ui',
    envDir: '..',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'ui/index.html'),
                app: resolve(__dirname, 'ui/app/index.html')
            }
        }
    },
    server: {
        port: 3000,
        open: true
    }
});

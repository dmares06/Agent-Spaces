import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
// Plugin to copy preload file
function copyPreload() {
    return {
        name: 'copy-preload',
        writeBundle: function () {
            var src = path.resolve(__dirname, 'electron/preload.js');
            var dest = path.resolve(__dirname, 'dist-electron/preload.cjs');
            fs.copyFileSync(src, dest);
            console.log('[copy-preload] Copied preload.js to preload.cjs');
        }
    };
}
export default defineConfig({
    plugins: [
        react(),
        electron([
            {
                entry: 'electron/main.ts',
                onstart: function (_a) {
                    var startup = _a.startup;
                    startup();
                },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['better-sqlite3', 'node-pty', 'electron-reloader'],
                            output: {
                                format: 'es',
                            },
                        },
                        copyPublicDir: false,
                    },
                    publicDir: false,
                    plugins: [copyPreload()],
                },
            },
        ]),
        renderer(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
    },
    base: './',
    build: {
        outDir: 'dist',
    },
});

import { defineConfig } from "vite";
import reactRefrest from '@vitejs/plugin-react'
import svgrPlugin from 'vite-plugin-svgr'

export default defineConfig({
    server: {
        proxy: {
            '/api': {
            target: 'http://localhost:3001', // URL вашего бэкенд сервера
            changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
    build: {
        outDir: '',
    },
    plugins: [
        reactRefrest(),
        svgrPlugin({
            svgrOptions: {
                icon: true,

            }
        })
    ],
})

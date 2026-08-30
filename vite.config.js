import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  // `npm run build` (mode=production) and `npm run build:dev`
  // (mode=development) would otherwise both write to dist/ and clobber
  // each other — separate output dirs so both builds can coexist and
  // `preview`/`preview:dev` each serve the one they actually built.
  build: {
    outDir: mode === 'development' ? 'dist-dev' : 'dist',
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SerosIT',
        short_name: 'SerosIT',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1a3f7a',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Same-origin in dev: the frontend calls relative /api/* paths and Vite
      // forwards them to Django, so no CORS handling is needed locally.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}))
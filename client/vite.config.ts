import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Keep the hand-authored manifest from Task 0.2 (public/manifest.webmanifest);
      // the plugin only generates the service worker here.
      manifest: false,
      workbox: {
        // App shell precache (Cache First) — offline cold start (Task 7.1).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // Pull in the Web Push event handlers (Task 05) — runs in the SW scope.
        importScripts: ['/push-sw.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Customer read-only snapshots (balance, history) — Stale-While-Revalidate.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              /^\/api\/me(\/(transactions|redemptions))?$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'bp-customer-reads',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Everything else under /api (login, scan, earn, redeem, oauth) — never cached.
            // Writes must fail clearly offline, never serve stale data (R1/R2).
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
      // No SW in dev to keep HMR clean; it's generated for build/preview.
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    host: true, // also listen on the LAN so a phone on the same Wi-Fi can reach it
    proxy: {
      // Proxy API calls to the Express backend (see /server, port 3001).
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` uses its own proxy config (serves the built SW for PWA testing).
  preview: {
    port: 4173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})


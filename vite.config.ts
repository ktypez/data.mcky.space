import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { webVitalsReport } from './vite-webvitals-plugin.mjs'
import path from 'path'

const projectRoot = import.meta.dirname

export default defineConfig({
  plugins: [
    react({ include: '**/*.{jsx,tsx}' }),
    tailwindcss(),
    webVitalsReport(),
    VitePWA({
      // Prompt flow: a new SW installs and WAITS; the UI shows an
      // "update available" banner and only applies it on user action.
      // Prevents mid-session asset swaps under a live form.
      registerType: 'prompt',
      // Public manifest is the single source of truth.
      manifest: false,
      injectRegister: null,
      workbox: {
        // globPatterns already covers everything in public/, so the previous
        // includeAssets of the icons only listed them a second time — 28KB of
        // duplicate precache entries on every install.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The design lab is an internal route under /__design_lab, not part of
        // the catalog experience, so it does not need to work offline.
        globIgnores: ['assets/DetailLabApp-*.js'],
        // Only known app navigations receive the shell; never API/auth/assets.
        navigateFallbackAllowlist: [/^\/$/, /^\/(?:add|trash|maps|settings)\/?$/, /^\/(?:c|edit)\/[^/]+\/?$/],
        importScripts: ['sw-cleanup.js'],
        runtimeCaching: [],
        // Evict precaches from superseded SW versions on activation.
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, './src'),
      'class-variance-authority': path.resolve(
        projectRoot,
        'node_modules/class-variance-authority',
      ),
      clsx: path.resolve(projectRoot, 'node_modules/clsx'),
      'tailwind-merge': path.resolve(projectRoot, 'node_modules/tailwind-merge'),
      leaflet: path.resolve(projectRoot, 'node_modules/leaflet'),
      cookie: path.resolve(projectRoot, 'src/shims/cookie.js'),
      'set-cookie-parser': path.resolve(projectRoot, 'src/shims/set-cookie-parser.js'),
    },
    dedupe: [
      'react',
      'react-dom',
      'leaflet',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
    ],
  },
  optimizeDeps: {
    include: [
      'leaflet',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
    ],
  },
  build: {
    chunkSizeWarningLimit: 500, // KB
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/leaflet')) {
            return 'map'
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor'
          }
          // NOTE: no manual chunk for `@phosphor-icons`. The barrel already
          // tree-shakes, but a single named chunk forces every icon used by a
          // lazy route into the entry's preload set. Let rolldown split them so
          // the shell only ships the handful of nav icons it paints.
          if (id.includes('node_modules/class-variance-authority') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) {
            return 'ui'
          }
          if (id.includes('node_modules/zustand')) {
            return 'stores'
          }
          // NOTE: no manual chunk for `motion`. Forcing it into a named chunk
          // made rolldown emit a *static* import from the entry, so the 41KB
          // chunk was preloaded on every cold start even though only the lazy
          // Editor route (via ui/dialog -> PhotoUploadModal) ever needs it.
          // Left to rolldown it lands in the Editor chunk instead.
        },
      },
    },
  },
})
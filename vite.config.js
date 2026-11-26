import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Bind to 0.0.0.0 so the live preview proxy can reach the dev server.
// In dev, /api proxies to the real worker (which only allows the production
// origin) so local development still uses live D1 data.
export default defineConfig({
  plugins: [svelte()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://data-api.fall3n.workers.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: { host: true, port: 4173 }
});

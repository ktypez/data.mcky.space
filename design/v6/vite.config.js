import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Bind to 0.0.0.0 so the live preview proxy can reach the dev server.
export default defineConfig({
  plugins: [svelte()],
  server: { host: true, port: 5173, strictPort: false, allowedHosts: true },
  preview: { host: true, port: 4173 }
});

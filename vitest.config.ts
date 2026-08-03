import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Vitest config. Kept separate from `vite.config.ts` because tests only
 * need the `@/` path alias — none of the React/Tailwind/MapLibre plugin
 * stack is required for the pure-function unit tests we run today.
 *
 * When we add component tests (PR later) we'll extend this with
 * `react()` + `environment: 'jsdom'` + `setupFiles`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    // Keep the watch list tight — vite-plugin-react etc. would otherwise
    // try to crawl the whole tree and choke on the maplibre-gl CSS bundle.
  },
})

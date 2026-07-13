import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react({ include: '**/*.{jsx,tsx}' }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'class-variance-authority': path.resolve(
        __dirname,
        'node_modules/class-variance-authority',
      ),
      clsx: path.resolve(__dirname, 'node_modules/clsx'),
      'tailwind-merge': path.resolve(__dirname, 'node_modules/tailwind-merge'),
      'maplibre-gl': path.resolve(__dirname, 'node_modules/maplibre-gl'),
      // react-router@7.x imports { parse, serialize } from "cookie" into the
      // browser bundle, but pnpm's strict layout hides the deep copy and the
      // root hoist is cookie@2.x (no named exports). Aliasing the package
      // folder caused EMFILE (ulimit 1024) from repeated stat calls, so we
      // point at a tiny local ESM shim (the API react-router uses is tiny).
      cookie: path.resolve(__dirname, 'src/shims/cookie.js'),
    },
    dedupe: [
      'react',
      'react-dom',
      'maplibre-gl',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
    ],
  },
  optimizeDeps: {
    include: [
      'maplibre-gl',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
    ],
  },
})

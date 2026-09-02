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
      cookie: path.resolve(__dirname, 'src/shims/cookie.js'),
      'set-cookie-parser': path.resolve(__dirname, 'src/shims/set-cookie-parser.js'),
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
  build: {
    chunkSizeWarningLimit: 500, // KB
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor'
          }
          if (id.includes('node_modules/@phosphor-icons') || id.includes('node_modules/class-variance-authority') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) {
            return 'ui'
          }
          if (id.includes('node_modules/zustand')) {
            return 'stores'
          }
        }
      }
    }
  },
})
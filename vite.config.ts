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

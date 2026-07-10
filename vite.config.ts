import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      include: '**/*.{jsx,tsx}',
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  customLogger: {
    warn(msg, options) {
      if (typeof msg === 'string' && msg.includes('Failed to resolve import')) return
      if (options?.code === 'UNRESOLVED_IMPORT') return
      console.warn(msg)
    },
    info(msg) {
      console.log(msg)
    },
    error(msg) {
      console.error(msg)
    },
    warnOnce(msg, options) {
      this.warn(msg, options)
    },
    clearScreen() {},
    hasWarned: false,
    hasErrorLogged: false,
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT') return
        warn(warning)
      },
    },
  },
})

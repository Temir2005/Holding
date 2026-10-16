import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  optimizeDeps: {
    // The admin sections are lazy chunks: without this, the dev server would find their
    // dependencies only when a section is first opened, re-bundle and reload every open tab.
    entries: [
      'index.html',
      'src/admin/**/*.{ts,tsx}',
      '!src/admin/**/*.test.{ts,tsx}',
      '!src/admin/test/**',
    ],
  },
  server: {
    // File events do not cross Docker bind mounts on macOS (Colima/Docker Desktop), so poll.
    watch: { usePolling: process.env.VITE_USE_POLLING === 'true', interval: 300 },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

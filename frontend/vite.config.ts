import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api/assess/ws': {
        target: 'ws://localhost:18903',
        ws: true,
      },
      '/api': 'http://localhost:18903',
    },
  },
})

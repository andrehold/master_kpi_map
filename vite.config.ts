import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': './src'
    },
  },
  server: {
    proxy: {
      '/api/v2': {
        target: 'https://www.deribit.com',
        changeOrigin: true,
        secure: true,
      },
      "/fred": {
        target: "https://api.stlouisfed.org",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true
      }
    },
  },
})

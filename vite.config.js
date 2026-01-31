import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Деплой в корень домена nashsklad.store
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['nashsklad.store', 'www.nashsklad.store', 'localhost', '127.0.0.1']
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})

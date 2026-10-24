import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // WARNING: Change this if your backend runs on a different port (e.g., 5000 or 8000)
        changeOrigin: true,
        secure: false
      }
    }
  }
});

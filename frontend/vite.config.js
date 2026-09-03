import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Exclude backend-only modules from being bundled into the frontend
      external: ['resend', 'openai', 'fs', 'path'],
    },
  },
});
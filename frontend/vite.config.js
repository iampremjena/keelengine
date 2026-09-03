import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      external: [
        'resend',
        'openai',
        'fs',
        'path',
        'os',
        'crypto',
        'http',
        'https',
        'stream',
        'zlib',
        'child_process'
      ]
    },
    rollupOptions: {
      external: [
        'resend',
        'openai',
        'fs',
        'path',
        'os',
        'crypto',
        'http',
        'https',
        'stream',
        'zlib',
        'child_process'
      ]
    }
  }
});
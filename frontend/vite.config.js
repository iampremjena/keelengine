import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
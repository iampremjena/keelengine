import { defineConfig } from 'vite'
import react from '@vitejs/react-package' // or whatever your default react plugin import is

export default defineConfig({
  plugins: [react()],
  base: './', // <--- ADD THIS LINE EXACTLY
})
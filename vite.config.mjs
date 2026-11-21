import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',   // makes the built app work when opened from a file
  server: { host: '127.0.0.1', port: 5173, strictPort: true }
});

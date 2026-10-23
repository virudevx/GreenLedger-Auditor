import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

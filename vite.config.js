import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@netlify/vite-plugin';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Only emulate what this app uses (edge functions need Deno locally and aren't used here)
    netlify({ edgeFunctions: { enabled: false }, aiGateway: { enabled: false }, images: { enabled: false }, geolocation: { enabled: false } }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        customer: resolve(import.meta.dirname, 'customer/index.html'),
        kitchen: resolve(import.meta.dirname, 'kitchen/index.html'),
      },
    },
  },
});

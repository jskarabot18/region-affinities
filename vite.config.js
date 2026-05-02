import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves from /region-affinities/, so all asset paths must be prefixed.
// In dev (`npm run dev`), base resolves to '/' as expected.
export default defineConfig({
  plugins: [react()],
  base: '/region-affinities/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});

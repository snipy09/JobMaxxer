import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  base: './',
  root: path.join(__dirname, 'src/renderer'),
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          config: path.join(__dirname, 'tailwind.config.js'),
        }),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: path.join(__dirname, 'out/renderer'),
    emptyOutDir: true,
  },
  server: { port: 5173, strictPort: true },
  resolve: { alias: { '@': path.join(__dirname, 'src') } },
});
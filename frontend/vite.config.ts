import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/static/',
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  resolve: {
    alias: {
      components: path.resolve(__dirname, 'src/components'),
      styles: path.resolve(__dirname, 'src/styles'),
      utils: path.resolve(__dirname, 'src/utils'),
      Popover: path.resolve(__dirname, 'src/Popover'),
    },
  },
  server: {
    port: 3000,
    host: true,
    origin: 'http://localhost:3000',
  },
  build: {
    manifest: 'manifest.json',
    outDir: path.resolve(__dirname, '../assets/dist'),
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.jsx'),
    },
  },
});

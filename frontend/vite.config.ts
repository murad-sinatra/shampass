import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const libraryRoot = fileURLToPath(new URL('./node_modules/mors-component-library', import.meta.url));

/**
 * The library's package exports point at a built `dist/`. A GitHub install
 * ships source, so the app resolves the public entry and stylesheet to `src/`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'mors-component-library/styles.css',
        replacement: `${libraryRoot}/src/styles/index.css`,
      },
      {
        find: /^mors-component-library$/,
        replacement: `${libraryRoot}/src/index.ts`,
      },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
});

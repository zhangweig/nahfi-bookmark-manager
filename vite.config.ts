import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'fs';

// Plugin: flatten popup HTML output to root of dist/
// Vite preserves input directory structure, but Chrome extension
// needs popup.html at the root of the extension folder.
function flattenPopupPlugin() {
  return {
    name: 'flatten-popup-output',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const srcPath = resolve(distDir, 'src/popup/index.html');
      const destPath = resolve(distDir, 'popup.html');

      if (existsSync(srcPath)) {
        let content = readFileSync(srcPath, 'utf-8');
        // Vite computes paths relative to the input file location (src/popup/),
        // producing "../../popup.js" etc. Since we're moving the HTML to dist root,
        // fix the relative paths to "./popup.js" and "./assets/popup.css".
        content = content.replace(/\.\.\/\.\.\//g, './');
        writeFileSync(destPath, content);
        // Clean up the nested src directory
        rmSync(resolve(distDir, 'src'), { recursive: true, force: true });
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), flattenPopupPlugin()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const here = path.dirname(fileURLToPath(import.meta.url))

// The runtime of an exported mask: one script and one stylesheet, which the
// export writes into the HTML file. Built before dev, build and test.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(here, 'src') } },
  define: { 'process.env.NODE_ENV': '"production"' },
  publicDir: false,
  build: {
    outDir: 'src/export/generated',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(here, 'src/runtime/mount.tsx'),
      name: 'AufbauMaske',
      formats: ['iife'],
      fileName: () => 'runtime.js',
      cssFileName: 'runtime',
    },
    target: 'es2020',
    minify: true,
  },
})

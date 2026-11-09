import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const here = path.dirname(fileURLToPath(import.meta.url))

// The editor. Fixed port: masks and the library saved in the browser hang on
// the origin http://localhost:5300; another port would not find them.
export default defineConfig({
  server: { port: 5300, strictPort: true },
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(here, 'src') } },
})

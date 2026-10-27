import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(here, 'src'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'happy-dom',
    // vitest stubs CSS by default; the export test needs the real mask.css?raw.
    css: true,
  },
})

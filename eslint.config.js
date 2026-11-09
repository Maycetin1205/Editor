import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Which layer may use which. The model knows nothing of React or the DOM; the
// SoftEngine adapter is reached only through the MaskHost of the runtime.
const layer = (files, forbidden, message) => ({
  files,
  rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: forbidden, message }] }],
  },
})

export default defineConfig([
  globalIgnores(['dist', 'src/export/generated', '.claude']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  layer(
    ['src/model/**'],
    ['react', 'react-dom', '@/runtime/*', '@/blocks/*', '@/editor/*', '@/softengine/*', '@/export/*'],
    'Das Modell kennt weder React noch die anderen Schichten.',
  ),
  layer(
    ['src/softengine/**'],
    ['react', 'react-dom', '@/runtime/*', '@/blocks/*', '@/editor/*', '@/export/*'],
    'Der SoftEngine-Anschluss kennt nur das Modell.',
  ),
  layer(
    ['src/runtime/**', 'src/blocks/**'],
    ['@/editor/*', '@/export/*'],
    'Die Maske läuft ohne den Editor.',
  ),
])

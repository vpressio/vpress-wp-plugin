import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import { fileURLToPath } from 'node:url';

// The plugin root, so the ../blocks override resolves the same way whether
// ESLint runs from admin/ or from the root with -c admin/eslint.config.js.
const pluginRoot = fileURLToPath(new URL('..', import.meta.url));

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/prop-name-casing': 'off',
      'vue/order-in-components': 'off',
      'vue/require-prop-types': 'off',
      // Pre-existing prop mutations carried over verbatim from the Vue 2
      // codebase (chart-container parse*, variable-card selectFunc).
      'vue/no-mutating-props': 'warn',
      // Legacy error-handling style carried over verbatim: catch blocks
      // rethrow `new Error(error.message)` and often ignore the caught var.
      'preserve-caught-error': 'warn',
      'no-unused-vars': ['warn', { caughtErrors: 'none' }]
    },
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        FormData: 'readonly',
        Intl: 'readonly',
        URL: 'readonly',
        XMLSerializer: 'readonly',
        btoa: 'readonly',
        Image: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        fetch: 'readonly',
        self: 'readonly',
        globalThis: 'readonly'
      }
    }
  },
  // Block editor scripts (../blocks): plain, unbuilt browser scripts on the
  // `wp.*` globals WordPress prints; their tests are Vitest ES modules.
  // Lint with `yarn lint:blocks` (runs ESLint from the plugin root: files
  // outside admin/ are otherwise outside this config's base path).
  {
    basePath: pluginRoot,
    files: ['blocks/**/*.js'],
    ignores: ['blocks/**/tests/**'],
    languageOptions: {
      ecmaVersion: 2017,
      sourceType: 'script',
      globals: {
        wp: 'readonly',
        window: 'readonly',
        document: 'readonly',
        Promise: 'readonly',
        WeakMap: 'readonly'
      }
    }
  },
  {
    basePath: pluginRoot,
    files: ['blocks/**/tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        Event: 'readonly'
      }
    }
  },
  { ignores: ['dist/**', 'node_modules/**'] }
];

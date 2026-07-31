import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';

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
        self: 'readonly',
        globalThis: 'readonly'
      }
    }
  },
  { ignores: ['dist/**', 'node_modules/**'] }
];

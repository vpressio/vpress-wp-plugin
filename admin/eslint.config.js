import pluginVue from 'eslint-plugin-vue';

export default [
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
      'vue/no-mutating-props': 'warn'
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
        URL: 'readonly'
      }
    }
  },
  { ignores: ['dist/**', 'node_modules/**'] }
];

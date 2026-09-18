import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/**', 'dist-extension/**', 'node_modules/**', 'public/**', 'coverage/**'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  { files: ['src/**/*.js'], languageOptions: { globals: { ...globals.browser } } },
  {
    files: ['src/extension/**', 'src/data/prefs.js'],
    languageOptions: { globals: { ...globals.webextensions } },
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // page.evaluate() callbacks run in the browser, not Node.
    files: ['tests/e2e/**'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  prettier,
];

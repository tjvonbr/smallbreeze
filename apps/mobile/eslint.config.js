// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Rules added in eslint-config-expo 58 that flag existing code. Kept visible as
    // warnings until those effects/refs are refactored.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      // False positive: Notifications.AndroidImportance is re-exported via `export *`.
      'import/namespace': 'warn',
    },
  },
]);

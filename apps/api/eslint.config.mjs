import { nestJsConfig } from '@mybills/eslint-config/nest.js';

/** @type {import("eslint").Linter.Config} */
export default [
  ...nestJsConfig,
  {
    ignores: ['.prettierrc.mjs', 'eslint.config.mjs'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
];

import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.output/', '.wxt/', 'node_modules/', 'playwright-report/', 'test-results/'],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'eval is not allowed (MV3 CSP).',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.{ts,mjs}', '*.config.{ts,js}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);

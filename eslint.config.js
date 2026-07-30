// ESLint v9 flat config
import js from '@eslint/js';
import tsEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

const tsPlugins = {
  '@typescript-eslint': tsEslint
};

const tsRules = {
  ...tsEslint.configs.recommended.rules,
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/explicit-module-boundary-types': 'off'
};

export default [
  // Base recommended config
  js.configs.recommended,

  // Source files (type-aware: tsconfig.json includes only src)
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
        NodeJS: 'readonly',
        RequestInit: 'readonly'
      }
    },
    plugins: tsPlugins,
    rules: tsRules
  },

  // Test files (no type-aware parsing: tsconfig.json excludes tests, so
  // `project` would fail with a parsing error on every test file)
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
        ...globals.jest,
        NodeJS: 'readonly',
        RequestInit: 'readonly'
      }
    },
    plugins: tsPlugins,
    rules: tsRules
  },

  // Ignore patterns
  {
    ignores: ['dist/', 'node_modules/', 'scripts/', '**/*.js', '**/*.cjs']
  }
];

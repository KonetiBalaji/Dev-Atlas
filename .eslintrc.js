// DevAtlas ESLint Configuration
// Created by Balaji Koneti

module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'next/core-web-vitals',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
    browser: true,
    jest: true,
  },
  globals: {
    jest: 'readonly',
    describe: 'readonly',
    it: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly',
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    'no-const-assign': 'error',
    'react/no-unescaped-entities': 'off',
  },
  ignorePatterns: ['dist/', 'build/', 'node_modules/', '*.js'],
};

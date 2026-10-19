/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  extends: ['@vue/eslint-config-standard', '@packages/eslint-config-custom'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest'
  },
  rules: {
    quotes: ['error', 'single'],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  }
};

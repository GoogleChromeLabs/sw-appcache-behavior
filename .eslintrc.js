module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  extends: ['eslint:recommended', 'google'],
  env: {
    es6: true,
  },
  rules: {
    // See https://github.com/eslint/typescript-eslint-parser/issues/457
    'no-unused-vars': ['off'],
    'require-jsdoc': ['off'],
    'spaced-comment': ['off'],
  },
  overrides: [{
    files: ['lib/**'],
    env: {
      serviceworker: true,
      browser: true, 
    },
  }, {
    files: ['packages/appcache-polyfill-sw/**'],
    env: {
      serviceworker: true,
    },
  }, {
    files: ['packages/appcache-polyfill-window/**'],
    env: {
      browser: true,
    },
  }, {
    files: ['puppeteer-tests/**'],
    env: {
      browser: true,
      mocha: true,
      node: true,
      serviceworker: true,
    },
    globals: {
      appcachePolyfill: 'readonly',
    },
    rules: {
      'max-len': ['off'],
      'no-console': ['off'],
    },
  }],
};

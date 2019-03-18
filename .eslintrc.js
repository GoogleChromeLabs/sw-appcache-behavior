module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  extends: ['eslint:recommended'],
  env: {
    es6: true,
  },
  rules: {
    // See https://github.com/eslint/typescript-eslint-parser/issues/457
    'no-unused-vars': ['off'],
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
  }],
};

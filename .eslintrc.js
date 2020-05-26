module.exports = {
  env: {
    node: true,
    commonjs: true,
    es6: true,
    'jest/globals': true
  },
  extends: [
    'standard'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: { },
  plugins: ['jest']
}

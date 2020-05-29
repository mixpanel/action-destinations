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
    SharedArrayBuffer: 'readonly',
    // fetch API provided by the Destination Function buildpack
    fetch: 'readonly',
    // action-kit entrypoint
    action: 'writable'
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: { },
  plugins: ['jest']
}

module.exports = {
  env: {
    node: true,
    commonjs: true,
    es6: true,
    'jest/globals': true,
    globals: {
      // fetch API provided by the Destination Function buildpack
      fetch: 'readonly',
      // action-kit entrypoint
      action: 'writable'
    }
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

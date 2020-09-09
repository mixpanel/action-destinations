module.exports = {
  env: {
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: ['eslint:recommended', 'standard', 'prettier'],
  rules: {},
  overrides: [
    {
      files: ['*.test.{js,ts}'],
      env: {
        'jest/globals': true,
      },
      extends: ['plugin:jest/recommended'],
      plugins: ['jest'],
    },
  ],
}

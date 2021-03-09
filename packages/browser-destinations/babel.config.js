module.exports = {
  presets: [
    ['@babel/preset-env', { modules: false }],
    '@babel/preset-typescript'
  ],
  env: {
    production: {
      plugins: ['babel-plugin-lodash']
    },
    test: {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
      plugins: ['@babel/plugin-transform-modules-commonjs']
    }
  }
}

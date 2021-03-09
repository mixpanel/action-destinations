const path = require('path')
const globby = require('globby')
const TerserPlugin = require('terser-webpack-plugin')
const CompressionPlugin = require('compression-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const files = globby.sync('./src/destinations/*/index.ts')
const isProd = process.env.NODE_ENV === 'production'

const entries = files.reduce((acc, current) => {
  const [_dot, _src, _destinations, destination, ..._rest] = current.split('/')
  return {
    ...acc,
    [destination]: current
  }
}, {})

const plugins = [new CompressionPlugin()]

entries['runtime'] = './src/runtime/index.ts'

if (process.env.ANALYZE) {
  plugins.push(new BundleAnalyzerPlugin({
    defaultSizes: 'stat'
  }))
}

module.exports = {
  entry: entries,
  mode: process.env.NODE_ENV || 'development',
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/web'),
    library: '[name]Destination',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        use: 'babel-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      vm: require.resolve('vm-browserify')
    }
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'build')
  },
  performance: {
    hints: 'warning'
  },
  optimization: {
    moduleIds: 'deterministic',
    minimize: isProd,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          ecma: '2015',
          mangle: true,
          compress: true,
          output: {
            comments: false
          }
        }
      })
    ]
  },
  plugins
}

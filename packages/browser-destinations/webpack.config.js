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

const plugins = isProd ? [new CompressionPlugin()] : []

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
    path: path.resolve(__dirname, 'dist/web'),
    publicPath: isProd ? 'https://ajs-next-integrations.s3-us-west-2.amazonaws.com/fab-5/' : undefined,
    library: '[name]Destination',
    libraryTarget: 'umd',
    libraryExport: 'default'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true
            }
          }
        ]
      }
    ]
  },
  resolve: {
    modules: [
      // use current node_modules directory first (e.g. for tslib)
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ],
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
    ],
    splitChunks: {
      cacheGroups: {
        default: false,
        defaultVendors: false,
        commons: {
          chunks: 'all',
          minChunks: 2
        }
      }
    }
  },
  plugins
}

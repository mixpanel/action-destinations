const webpack = require('webpack')
const tmp = require('tmp')
const { join, basename } = require('path')
const { readFileSync } = require('fs')
const TerserPlugin = require('terser-webpack-plugin')
const MomentLocalesPlugin = require('moment-locales-webpack-plugin')

const DESTINATION = '_destination'

// pack takes a destination subdirectory and returns a promise that resolves to
// the path to a webpack-compiled version of that destination with the default
// export function available in the DESTINATION variable.
async function pack (inputDir) {
  console.log(`Compiling ${basename(inputDir)}`)

  const tmpdir = tmp.dirSync().name
  const tmpfile = 'index.js'

  return new Promise((resolve, reject) => {
    webpack({
      target: 'node',
      entry: inputDir,
      output: {
        path: tmpdir,
        filename: tmpfile,
        library: DESTINATION,
        libraryTarget: 'var'
      },
      mode: 'production',
      optimization: {
        minimize: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              // We use class names for logging in action-kit. If that gets fixed, this whole
              // 'optimization' block can go away.
              keep_classnames: true
            }
          })
        ]
      },
      plugins: [
        new MomentLocalesPlugin()
      ]
    }, (err, stats) => {
      if (err || stats.hasErrors()) {
        reject(err || stats.toJson().errors || 'unknown error')
      }
      resolve(join(tmpdir, tmpfile))
    })
  })
}

function adapter () {
  return `module.exports.onEvent = ${DESTINATION}.onEvent.bind(${DESTINATION})`
}

// compile returns the compiled version of the destination at the given path
// (e.g. './destinations/slack)
module.exports.compile = async (path) => {
  const f = await pack(path)
  return readFileSync(f).toString() + adapter()
}

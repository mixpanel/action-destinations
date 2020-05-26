const webpack = require('webpack')
const tmp = require('tmp')
const { join } = require('path')
const { readFileSync } = require('fs')

// ENTRYPOINT is the name the default export function of the webpack-compiled JS
// file so that we can add our adapter.
const ENTRYPOINT = '__'

// pack takes a destination subdirectory and returns a promise that resolves to
// the path to a webpack-compiled version of that destination with the default
// export function available in the ENTRYPOINT variable.
const pack = (inputDir) => {
  const tmpdir = tmp.dirSync().name
  const tmpfile = 'index.js'

  return new Promise((resolve, reject) => {
    webpack({
      entry: inputDir,
      output: {
        path: tmpdir,
        filename: tmpfile,
        library: ENTRYPOINT,
        libraryExport: 'default',
        libraryTarget: 'var'
      },
      mode: 'none',
      optimization: {
        usedExports: true
      }
    }, (err, stats) => {
      if (err || stats.hasErrors()) {
        reject(err || stats.toJson().errors || 'unknown error')
      }
      resolve(join(tmpdir, tmpfile))
    })
  })
}

// adapter is a hack to bridge between funk's custom module handling and our
// webpack-compiled file. There's probably a better way to do this.
function adapter () {
  return ['Track', 'Identify', 'Group', 'Page', 'Screen', 'Alias', 'Delete'].map(
    (event) => (`async function on${event} (...a) { return ${ENTRYPOINT}(...a) };`)
  ).join('\n')
}

// compile returns the compiled version of the given destination subdirectory
// (.e.g './destinations/slack)
module.exports.compile = async (dir) => {
  const f = await pack(dir)
  return readFileSync(f).toString() + adapter()
}

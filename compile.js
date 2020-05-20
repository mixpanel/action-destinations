const webpack = require('webpack')
const tmp = require('tmp')
const { join } = require('path')
const { readFileSync } = require('fs')

const pack = async (inputDir) => {
  const tmpdir = tmp.dirSync().name
  const tmpfile = 'index.js'

  return new Promise((resolve, reject) => {
    webpack({
      entry: inputDir,
      output: {
        path: tmpdir,
        filename: tmpfile,
        library: '__',
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

// This is a hack to bridge between funk's custom module handling and our
// webpack-compiled file. There's probably a better way to do this.
function adapter () {
  return ['Track', 'Identify', 'Group', 'Page', 'Screen', 'Alias', 'Delete'].map(
    (event) => (`async function on${event} (...a) { return __(...a) };`)
  ).join('\n')
}

// compile returns the compiled version of the given destination subdirectory
// (.e.g './destinations/slack)
module.exports.compile = (dir) => {
  return pack(dir).then((f) => {
    return readFileSync(f).toString() + adapter()
  })
}

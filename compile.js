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
        filename: tmpfile
      },
      mode: 'production',
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

module.exports.compile = (dir) => {
  return pack(dir).then((f) => {
    return readFileSync(f).toString()
  })
}

const webpack = require('webpack')
const tmp = require('tmp')
const { join, basename } = require('path')
const { readFileSync, readdirSync, writeFile, unlinkSync } = require('fs')

// ENTRYPOINT is the name the default export function of the webpack-compiled JS
// file so that we can add our adapter.
const ENTRYPOINT = '__'

function actionSlugs (dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter(f => f.isDirectory())
    .map(f => f.name)
}

// synthesizeIndex takes a destination subdirectory and creates an index.js file
// that exports an entrypoint using destination-kit. The index.js file should be
// removed when we're done compiling the destination bundle.
async function synthesizeIndex (inputDir) {
  const partnerActions = actionSlugs(inputDir)

  console.log(`  - ${partnerActions.join(', ')}\n`)

  const js = [
    "require('../../lib/destination-kit')",
    "export default destination(require('./destination.json'))",
    ...partnerActions.map((n) => `\t.partnerAction(${JSON.stringify(n)}, require('./${n}'))`),
    '\t.handler()'
  ].join('\n')

  return new Promise((resolve, reject) => {
    const path = join(inputDir, 'index.js')
    writeFile(path, js, (err) => {
      if (err) return reject(err)
      resolve(path)
    })
  })
}

// pack takes a destination subdirectory and returns a promise that resolves to
// the path to a webpack-compiled version of that destination with the default
// export function available in the ENTRYPOINT variable.
async function pack (inputDir) {
  console.log(`Compiling ${basename(inputDir)}`)

  const indexPath = await synthesizeIndex(inputDir)
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
      unlinkSync(indexPath) // cleanup
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

function loadSettings (dir) {
  return safeRequire(join(dir, 'settings.json')) || []
}

function loadActions (dir) {
  const slugs = actionSlugs(dir)

  return slugs.map(slug => {
    const settings = loadSettings(join(dir, slug)) || []
    return { slug, settings }
  })
}

function safeRequire (path) {
  try {
    return require(path)
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') return undefined
    else throw e
  }
}

// compile returns the compiled version of the given destination subdirectory
// (.e.g './destinations/slack)
module.exports.compile = async (dir) => {
  const f = await pack(dir)
  const code = readFileSync(f).toString() + adapter()

  const settings = loadSettings(dir)
  const actions = loadActions(dir)

  return { code, settings, actions }
}

const listFunctions = require('./lib/list-functions')

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled rejection at: Promise', p, 'reason:', reason)
  throw new Error('TODO unhandled promise rejection')
})

exports.command = 'list-deployed [workspace]'

exports.describe = 'List deployed Fab 5 destinations.'

exports.builder = {
  workspace: {
    describe: 'Workspace ID to list Fab 5 destinations of.',
    default: 'lmD77Nebzz'
  }
}

exports.handler = async function(argv) {
  const { workspace } = argv

  const functions = await listFunctions(workspace)

  functions.forEach(fn => {
    console.log(`${fn.id}\t${fn.displayName}`)
  })
}

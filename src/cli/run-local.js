const { join, dirname, basename, resolve } = require('path')

exports.command = 'run-local <action>'

exports.describe = 'Run a partner action locally.'

exports.builder = {
  action: {
    describe: 'Path to destination action to run.',
    default: './destinations/noop/noop'
  },
  input: {
    alias: 'i',
    type: 'string',
    description: 'Path to input directory containing settings.json, payload.json, and mapping.json',
    default: './sample/slack'
  }
}

exports.handler = async function(argv) {
  const { action, input } = argv

  const destinationPath = resolve(dirname(action))
  const actionName = basename(action)

  const destination = require(destinationPath)

  const load = file => {
    const path = resolve(join(input, file))
    try {
      return require(path)
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        console.log(`${path} does not exist, using '{}'`)
        return {}
      } else {
        throw e
      }
    }
  }

  const result = await destination.default.partnerActions[actionName]._execute({
    payload: load('payload.json'),
    settings: load('settings.json'),
    mapping: load('mapping.json')
  })

  console.log('Result:', result)
}

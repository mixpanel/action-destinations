const { join, dirname, basename } = require('path')

// eslint-disable-next-line no-unused-expressions
require('yargs')
  .command('$0 [action]', 'Run a partner action locally.', (yargs) => {
    yargs
      .positional('action', {
        describe: 'Path to destination action to run.',
        default: './destinations/noop/noop'
      })
      .option('input', {
        alias: 'i',
        type: 'string',
        description: 'Path to input directory containing settings.json, payload.json, and mapping.json'
      })
  }, async (argv) => {
    const destinationPath = dirname(argv.action)
    const actionName = basename(argv.action)

    const destination = require(destinationPath)

    const load = (file) => {
      const path = './' + join(argv.input, file)
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

    const result = await destination.partnerActions[actionName]._execute({
      payload: load('payload.json'),
      settings: load('settings.json'),
      mapping: load('mapping.json')
    })

    console.log('Result:', result)
  }).argv

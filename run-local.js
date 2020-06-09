// hack because fetch is global in destination functions.
global.fetch = require('node-fetch')

// eslint-disable-next-line no-unused-expressions
require('yargs')
  .command('$0 [action]', 'Run a partner action locally.', (yargs) => {
    yargs
      .positional('action', {
        describe: 'The aciton to run.',
        default: 'slack/postToChannel'
      })
      .option('payload', {
        alias: 'p',
        type: 'string',
        description: 'path to payload JSON file',
        default: './sample/payload.json'
      })
      .option('mapping', {
        alias: 'm',
        type: 'string',
        description: 'path to mapping configuration JSON file',
        default: './sample/mapping.json'
      })
      .option('settings', {
        alias: 's',
        type: 'string',
        description: 'path to settings configuration JSON file',
        default: './sample/settings.json'
      })
  }, async (argv) => {
    const action = require(`./destinations/${argv.action}`)

    const result = await action._execute({
      payload: require(argv.payload),
      settings: require(argv.settings),
      mapping: require(argv.mapping)
    })

    console.log('Result:')
    console.log(result)
  }).argv

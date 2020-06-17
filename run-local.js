// eslint-disable-next-line no-unused-expressions
require('yargs')
  .command('$0 [destination] [action]', 'Run a partner action locally.', (yargs) => {
    yargs
      .positional('destination', {
        describe: 'The destination to run.',
        default: 'slack'
      })
      .positional('action', {
        describe: 'The aciton to run.',
        default: 'postToChannel'
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
    const destination = require(`./destinations/${argv.destination}`)

    const result = await destination.partnerActions[argv.action]._execute({
      payload: require(argv.payload),
      settings: require(argv.settings),
      mapping: require(argv.mapping)
    })

    console.log('Result:', result)
  }).argv

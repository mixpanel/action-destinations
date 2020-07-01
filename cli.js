// eslint-disable-next-line no-unused-expressions
require('yargs')
  .command(require('./lib/cli/run-local'))
  .command(require('./lib/cli/deploy'))
  .demandCommand()
  .help()
  .argv

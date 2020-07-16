#!/usr/bin/env node

// eslint-disable-next-line no-unused-expressions
require('yargs')
  .command(require('./lib/cli/run-local'))
  .command(require('./lib/cli/deploy'))
  .command(require('./lib/cli/list-deployed'))
  .command(require('./lib/cli/new-destination'))
  .command(require('./lib/cli/new-action'))
  .demandCommand()
  .help()
  .wrap(null)
  .argv

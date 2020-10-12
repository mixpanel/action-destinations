#!/usr/bin/env node

require('yargs')
  .command(require('./src/cli/run-local'))
  .command(require('./src/cli/new-destination'))
  .command(require('./src/cli/new-action'))
  .demandCommand()
  .help()
  .wrap(null).argv

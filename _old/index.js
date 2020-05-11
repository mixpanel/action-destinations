const Engine = require('./engine.js').Engine
const fs = require('fs')

if (process.argv.length !== 3) {
  console.log('usage: node index.js <config_file>')
  process.exit(1)
}

const configFile = fs.readFileSync(process.argv[process.argv.length - 1])
const config = JSON.parse(configFile)
const e = new Engine(config)

e.debug()
e.run()

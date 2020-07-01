const { exec } = require('child_process')
const { join } = require('path')

exports.command = 'new-action <destination> <action>'

exports.describe = 'Create a new action from a template.'

exports.builder = {
  destination: {
    describe: "Path to destination. E.g. './destinations/noop'"
  },
  action: {
    describe: 'Action slug'
  },
  template: {
    alias: 't',
    describe: 'Template directory.',
    default: './templates/new-action/simple'
  }
}

exports.handler = async function (argv) {
  const { destination, action, template } = argv

  const path = join(destination, action)

  console.log(`Copying template ${template} to ${path}`)

  exec(`cp -R ${template} ${path}`, (error) => {
    if (error) {
      throw new Error(`Failed to copy template: ${error.message}`)
    }
  })

  const index = join(destination, 'index.js')
  const boilerplate = `.partnerAction('${action}', require('./${action}'))`

  console.log(`Registering '${action}' in ${index}`)

  exec(`echo "  ${boilerplate}" >> ${index}`, (error) => {
    if (error) {
      throw new Error(`Failed to add action to ${index}: ${error.message}`)
    }
  })

  console.log('Done!')
}

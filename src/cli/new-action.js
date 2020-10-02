const { exec } = require('child_process')
const { join } = require('path')
const { readdirSync, existsSync } = require('fs')
const prompts = require('prompts')

exports.command = 'new-action <destination> <action>'

exports.describe = 'Create a new action from a template.'

exports.builder = {
  destination: {
    describe: "Path to destination. E.g. './destinations/noop'."
  },
  action: {
    describe: 'Action slug'
  },
  template: {
    alias: 't',
    describe: 'Action template from ./templates/new-action/'
  }
}

async function getTemplate() {
  const basePath = join(__dirname, '..', '..', 'templates', 'new-action')
  const input = await prompts({
    type: 'select',
    name: 'value',
    message: 'Choose an action template',
    choices: readdirSync(basePath, { withFileTypes: true })
      .filter(f => f.isDirectory())
      .map(dir => ({
        title: dir.name,
        value: dir.name
      }))
  })

  // If user hits ctrl-c we get undefined
  if (!input.value) require('process').exit(1)

  return join(basePath, input.value)
}

exports.handler = async function(argv) {
  const { destination, action } = argv
  const path = join(destination, action, '')

  if (!existsSync(destination))
    throw new Error(`Error: ${destination} does not exist. Be sure to use the path to the destination.`)
  if (existsSync(path)) throw new Error(`Error: ${path} already exists. Choose a new action name.`)

  let { template } = argv
  if (!template) template = await getTemplate()

  console.log(`Copying template ${template} to ${path}`)

  exec(`cp -R ${template} ${path}`, error => {
    if (error) {
      throw new Error(`Failed to copy template: ${error.message}`)
    }
  })

  const index = join(destination, 'index.js')
  const boilerplate = `.partnerAction('${action}', require('./${action}'))`

  console.log(`Registering '${action}' in ${index}`)

  exec(`echo "  ${boilerplate}" >> ${index}`, error => {
    if (error) {
      throw new Error(`Failed to add action to ${index}: ${error.message}`)
    }
  })

  console.log('Done!')
}

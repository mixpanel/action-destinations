const { exec } = require('child_process')
const { join, resolve } = require('path')
const { readdirSync } = require('fs')
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
    describe: 'Action template from ./templates/new-action/.'
  }
}

exports.handler = async function (argv) {
  const { destination, action } = argv
  let { template } = argv

  if (!template) {
    const input = await prompts({
      type: 'select',
      name: 'value',
      message: 'Choose an action template',
      choices: readdirSync('./templates/new-action/', { withFileTypes: true })
        .filter(f => f.isDirectory())
        .map(dir => ({
          title: dir.name,
          value: dir.name
        }))
    })
    template = input.value
  }

  if (!template) require('process').exit(1)

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

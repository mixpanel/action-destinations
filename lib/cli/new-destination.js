const { exec } = require('child_process')
const { join } = require('path')
const { readdirSync } = require('fs')
const prompts = require('prompts')

exports.command = 'new-destination <slug>'

exports.describe = 'Create a new destination from a template.'

exports.builder = {
  slug: {
    describe: "Destination slug. E.g. 'my-destination'",
  },
  template: {
    alias: 't',
    describe: 'Template directory from ./templates/new-destination/',
  },
}

async function getTemplate() {
  const basePath = './templates/new-destination/'
  const input = await prompts({
    type: 'select',
    name: 'value',
    message: 'Choose a destination template',
    choices: readdirSync(basePath, { withFileTypes: true })
      .filter(f => f.isDirectory())
      .map(dir => ({
        title: dir.name,
        value: dir.name,
      })),
  })

  // If user hits ctrl-c we get undefined
  if (!input.value) require('process').exit(1)

  return join(basePath, input.value)
}

exports.handler = async function (argv) {
  const { slug } = argv
  let { template } = argv
  if (!template) template = await getTemplate()

  const path = `./destinations/${slug}/`

  console.log(`Copying template ${template} to ${path}`)

  exec(`cp -R ${template} ${path}`, (error, stdout, stderr) => {
    if (error) {
      throw new Error(`Failed to copy template: ${error.message}`)
    }
  })

  console.log(
    `Done! Be sure to update the destination name in ${path}destination.json`,
  )
}

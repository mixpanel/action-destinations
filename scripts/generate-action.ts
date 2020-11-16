/**
 * CLI to generate action definition to insert into metadata setting description.
 */

import * as path from 'path'
import * as fs from 'fs'
import chalk from 'chalk'
import prompts from 'prompts'
import clipboardy from 'clipboardy'
import loadJsonFile from 'load-json-file'

const destinationsPath = path.join(__dirname, '..', 'src', 'destinations')

const run = async () => {
  const destinations = fs.readdirSync(destinationsPath).filter((file) => {
    return fs.statSync(path.join(destinationsPath, file)).isDirectory()
  })

  const { destination } = await prompts({
    type: 'select',
    name: 'destination',
    message: 'Destination:',
    choices: destinations.map((destination) => ({
      title: destination,
      value: destination
    }))
  })

  if (!destination) {
    return
  }

  const actions = fs
    .readdirSync(path.join(destinationsPath, destination))
    .filter((file) => {
      return fs.statSync(path.join(destinationsPath, destination, file)).isDirectory()
    })
    .filter((file) => {
      return fs.existsSync(path.join(destinationsPath, destination, file, 'payload.schema.json'))
    })

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'Action:',
    choices: actions.map((action) => ({
      title: action,
      value: action
    }))
  })

  if (!action) {
    return
  }

  const schema = await loadJsonFile(
    path.join(__dirname, '..', 'src', 'destinations', destination, action, 'payload.schema.json')
  )

  const definition = JSON.stringify(
    {
      slug: action,
      settings: [],
      schema
    },
    null,
    '  '
  )

  await clipboardy.write(definition)
  console.log(chalk`{green ✔} Copied to clipboard`)
}

run().catch((error) => {
  console.error(chalk`{red ✕} ${error.message}`)
  process.exitCode = 1
})

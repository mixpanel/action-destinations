/**
 * CLI to generate action definition to insert into metadata setting description.
 */

import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import prompts from 'prompts'
import clipboardy from 'clipboardy'
import { DestinationDefinition } from '@segment/destination-actions'

const destinationsPath = path.join(__dirname, '..', 'src', 'destinations')
const destinations = fs.readdirSync(destinationsPath).filter((file) => {
  return fs.statSync(path.join(destinationsPath, file)).isDirectory()
})

const run = async () => {
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

  const destinationPath = path.join(destinationsPath, destination)
  const destinationDefinition: DestinationDefinition = (await import(destinationPath)).default
  const actions = destinationDefinition.actions

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'Action:',
    choices: Object.keys(actions).map((action) => ({
      title: action,
      value: action
    }))
  })

  if (!action) {
    return
  }

  const actionDefinition = actions[action]

  const definition = JSON.stringify(
    {
      slug: action,
      settings: [],
      schema: {
        title: actionDefinition.title,
        description: actionDefinition.description,
        ...actionDefinition.schema
      }
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

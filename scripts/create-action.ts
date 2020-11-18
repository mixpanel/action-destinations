/**
 * CLI to stub a new destination
 */

import chalk from 'chalk'
import execa from 'execa'
import fs from 'fs'
import { camelCase, startCase } from 'lodash'
import Mustache from 'mustache'
import ora from 'ora'
import path from 'path'
import prompts, { PromptObject } from 'prompts'

interface ActionData {
  destination: string
  name: string
  description: string
  slug: string
  typeName: string
}

const destinationsDir = path.join(__dirname, '../src/destinations')
const destinations = fs.readdirSync(destinationsDir).filter((file) => {
  const stats = fs.statSync(path.join(destinationsDir, file))
  return stats.isDirectory()
})

const questions: PromptObject<keyof ActionData>[] = [
  {
    type: 'select',
    name: 'destination',
    message: 'Which destination?',
    choices: destinations.map((destination) => {
      return {
        title: destination,
        value: destination
      }
    })
  },
  {
    type: 'text',
    name: 'name',
    message: 'Action name:'
  },
  {
    type: 'text',
    name: 'description',
    message: 'Enter a description:'
  }
]

let spinner: ora.Ora

function renderTemplate(content: string, data: ActionData) {
  return Mustache.render(content, data)
}

async function createAction(action: ActionData): Promise<void> {
  const templatePath = path.join(__dirname, '../templates/action')
  const filesToCreate = fs.readdirSync(templatePath)

  const actionPath = path.join(__dirname, '../src/destinations', action.destination, action.slug)

  spinner = ora().start(`Creating ${chalk.bgMagenta.white(action.name)} action...`)

  if (fs.existsSync(actionPath)) {
    spinner.fail()
    console.log(chalk.red(`An action "${action.slug}" already exists. Skipping.`))
    return
  }

  fs.mkdirSync(actionPath)

  filesToCreate.forEach((file) => {
    const filePath = path.join(templatePath, file)

    spinner.text = chalk`Creating {bold src/destinations/${action.destination}/${action.slug}/${file}}`

    // TODO if we need sub-directories, this will need to be updated
    const template = fs.readFileSync(filePath, 'utf8')
    const contents = renderTemplate(template, action)

    const writePath = path.join(actionPath, file)
    fs.writeFileSync(writePath, contents, 'utf8')
  })

  spinner.succeed(`Scaffolding action`)

  try {
    spinner.start(chalk`Generating types for {bgMagenta.white ${action.slug}} action`)
    await execa('yarn', ['generate-types'])
    spinner.succeed()
  } catch (err) {
    spinner.fail()
  }

  console.log(``)
  console.log(chalk.green(`Done creating "${action.name}" 🎉`))
  console.log(chalk.green(`You can find it via: cd src/destinations/${action.destination}/${action.slug}`))
  console.log(``)
}

async function run() {
  const action = await prompts(questions)

  console.log(``)

  action.name = startCase(action.name)
  action.slug = camelCase(action.name)
  action.typeName = action.name.replace(/ /g, '')

  await createAction(action)

  const response = await prompts({
    type: 'confirm',
    name: 'goto',
    message: 'Open in VS Code?',
    initial: false
  })

  if (response.goto) {
    await execa('code', ['.', '--goto', `src/destinations/${action.destination}/${action.slug}/index.ts`])
  }
}

run().catch((error) => {
  if (spinner) {
    spinner.fail()
  }
  console.error(chalk.red(error.message))
  process.exitCode = 1
})

/**
 * CLI to stub a new destination
 */

import chalk from 'chalk'
import execa from 'execa'
import fs from 'fs'
import Mustache from 'mustache'
import ora from 'ora'
import path from 'path'
import prompts, { PromptObject } from 'prompts'
import slugify from 'slugify'

const promptOptions = {
  onCancel() {
    console.log('Exiting...')
    process.exit(0)
  }
}

interface DestinationData {
  name: string
  slug: string
  authentication: 'basic' | 'custom' | 'none'
}

const questions: PromptObject<keyof DestinationData>[] = [
  {
    type: 'text',
    name: 'name',
    message: 'Destination name:'
  },
  {
    type: 'text',
    name: 'slug',
    // @ts-ignore the types are missing the Function signature
    initial: (prev) => slugify(prev).toLowerCase(),
    message: 'Destination slug:'
  },
  {
    type: 'select',
    name: 'authentication',
    message: 'What authentication scheme does the API use?',
    choices: [
      {
        title: 'Custom',
        description: 'Most "API Key" based authentication should use this.',
        value: 'custom'
      },
      {
        title: 'Basic',
        description: 'https://tools.ietf.org/html/rfc7617',
        value: 'basic'
      },
      {
        title: 'None',
        value: 'none'
      }
    ],
    initial: 0
  }
]

function renderTemplate(content: string, data: DestinationData) {
  return Mustache.render(content, data)
}

let spinner: ora.Ora

const templates = {
  basic: 'basic-auth.ts',
  custom: 'custom-auth.ts',
  none: 'empty-destination.ts'
}

async function createDirectory(destination: DestinationData): Promise<void> {
  const templateFile = templates[destination.authentication] || templates.none
  const templatePath = path.join(__dirname, '../templates/destinations', templateFile)
  const destinationPath = path.join(__dirname, '../../destination-actions/src/destinations', destination.slug)

  spinner = ora().start(`Creating ${chalk.bgMagenta.white(destination.slug)}`)

  if (fs.existsSync(destinationPath)) {
    spinner.fail()
    console.log(chalk.red(`A destination with the slug "${destination.slug}" already exists. Skipping.`))
    return
  }

  fs.mkdirSync(destinationPath)

  // TODO if we need to support generating multiple files, this will need to be updated
  const template = fs.readFileSync(templatePath, 'utf8')
  const writePath = path.join(destinationPath, 'index.ts')
  const contents = renderTemplate(template, destination)

  spinner.text = chalk`Creating {bold ${writePath}}`
  fs.writeFileSync(writePath, contents, 'utf8')

  spinner.succeed(`Scaffolding directory`)

  try {
    spinner.start(chalk`Generating types for {bgMagenta.white ${destination.slug}} destination`)
    await execa('yarn', ['generate-types'])
    spinner.succeed()
  } catch (err) {
    spinner.fail()
  }

  console.log(``)
  console.log(chalk.green(`Done creating "${destination.name}" 🎉`))
  console.log(chalk.green(`You can find it via: cd ${destinationPath}`))
  console.log(``)
}

async function run() {
  const destination = await prompts(questions, promptOptions)
  console.log(``)

  await createDirectory(destination)
}

run().catch((error) => {
  if (spinner) {
    spinner.fail()
  }
  console.error(chalk.red(error.message))
  process.exitCode = 1
})

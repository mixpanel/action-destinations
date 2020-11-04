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

interface DestinationData {
  name: string
  slug: string
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
    initial: prev => slugify(prev).toLowerCase(),
    message: 'Destination slug:'
  }
]

function renderTemplate(content: string, data: DestinationData) {
  return Mustache.render(content, data)
}

let spinner: ora.Ora

async function createDirectory(destination: DestinationData): Promise<void> {
  const templatePath = path.join(__dirname, '../templates/destination')
  const filesToCreate = fs.readdirSync(templatePath)

  const destinationPath = path.join(__dirname, '../src/destinations', destination.slug)

  spinner = ora().start(`Creating ${chalk.bgMagenta.white(destination.slug)}`)

  if (fs.existsSync(destinationPath)) {
    spinner.fail()
    console.log(chalk.red(`A destination with the slug "${destination.slug}" already exists. Skipping.`))
    return
  }

  fs.mkdirSync(destinationPath)

  filesToCreate.forEach(file => {
    const filePath = path.join(templatePath, file)

    spinner.text = chalk`Creating {bold src/destinations/${file}}`

    // TODO if we need sub-directories, this will need to be updated
    const template = fs.readFileSync(filePath, 'utf8')
    const contents = renderTemplate(template, destination)

    const writePath = path.join(destinationPath, file)
    fs.writeFileSync(writePath, contents, 'utf8')
  })

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
  console.log(chalk.green(`You can find it via: cd src/destinations/${destination.slug}`))
  console.log(``)
}

async function run() {
  const destination = await prompts(questions)
  await createDirectory(destination)

  const response = await prompts({
    type: 'confirm',
    name: 'goto',
    message: 'Open in VS Code?',
    initial: false
  })

  if (response.goto) {
    await execa('code', ['.', '--goto', `src/destinations/${destination.slug}/index.ts`])
  }
}

run().catch(error => {
  if (spinner) {
    spinner.fail()
  }
  console.error(chalk.red(error.message))
  process.exitCode = 1
})

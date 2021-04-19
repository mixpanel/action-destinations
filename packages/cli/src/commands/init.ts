import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import fs from 'fs-extra'
import ora from 'ora'
import path from 'path'
import slugify from 'slugify'
import { autoPrompt } from '../prompt'
import { renderTemplate } from '../templates'
import GenerateTypes from './generate/types'

const templates = {
  'basic-auth': 'basic-auth.ts',
  'custom-auth': 'custom-auth.ts',
  minimal: 'empty-destination.ts'
}

export default class Init extends Command {
  protected spinner: ora.Ora = ora()

  static description = `
    Scaffolds a new integration directory with a template. This does not register or deploy the integration.
  `

  static examples = [
    `$ segment init my-integration`,
    `$ segment init my-integration --directory packages/destination-actions --template basic-auth`
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
    directory: flags.string({ char: 'd', description: 'base directory to scaffold the integration', default: '.' }),
    name: flags.string({ char: 'n', description: 'name of the integration' }),
    slug: flags.string({ char: 's', description: 'url-friendly slug of the integration' }),
    template: flags.enum({
      char: 't',
      options: ['basic-auth', 'custom-auth', 'minimal'],
      description: 'the template to use to scaffold your integration'
    })
  }

  static args = [
    {
      name: 'path',
      description: 'path to scaffold the integration'
    }
  ]

  async run() {
    const { args, flags } = this.parse(Init)
    const answers = await autoPrompt(flags, [
      {
        type: 'text',
        name: 'name',
        message: 'Integration name:'
      },
      {
        type: 'text',
        name: 'slug',
        // @ts-ignore the types are wrong
        initial: (prev) => slugify(flags.name || prev).toLowerCase(),
        message: 'Integrationg slug:'
      },
      {
        type: 'select',
        name: 'template',
        message: 'What template do you want to use?',
        choices: [
          {
            title: 'Custom Auth',
            description: 'Most "API Key" based integrations should use this.',
            value: 'custom-auth'
          },
          {
            title: 'Basic Auth',
            description: 'Integrations that use Basic Auth: https://tools.ietf.org/html/rfc7617',
            value: 'basic-auth'
          },
          {
            title: 'Minimal',
            value: 'minimal'
          }
        ],
        initial: 0
      }
    ])

    const { directory, name, slug, template } = answers
    if (!name || !slug || !template) {
      this.exit()
    }

    // For now, include the slug in the path, but when we support external repos, we'll have to change this
    const relativePath = path.join(directory, args.path || slug)
    const targetDirectory = path.join(process.cwd(), relativePath)
    this.spinner.start(`Creating ${chalk.bold(name)}`)

    if (fs.existsSync(targetDirectory)) {
      this.spinner.fail()
      this.warn(chalk.red(`There's already content in ${targetDirectory}. Exiting.`))
      this.exit()
    }

    fs.mkdirSync(targetDirectory)

    // TODO if we need to support generating multiple files, this will need to be updated
    // TODO extract the common bits
    const templateFile = templates[template as keyof typeof templates] || templates.minimal
    const templatePath = path.join(__dirname, '../../templates/destinations', templateFile)
    const templateContent = fs.readFileSync(templatePath, 'utf8')
    const contents = renderTemplate(templateContent, answers)
    const writePath = path.join(targetDirectory, 'index.ts')

    this.spinner.text = chalk`Creating {bold ${writePath}}`
    fs.writeFileSync(writePath, contents, 'utf8')
    this.spinner.succeed(`Scaffolding directory`)

    try {
      this.spinner.start(chalk`Generating types for {magenta ${slug}} destination`)
      await GenerateTypes.run(['--path', relativePath])
      this.spinner.succeed()
    } catch (err) {
      this.spinner.fail(chalk`Generating types for {magenta ${slug}} destination: ${err.message}`)
    }

    this.log(chalk.green(`Done creating "${name}" 🎉`))
    this.log(chalk.green(`Start coding! cd ${targetDirectory}`))
  }

  async catch(error: unknown) {
    this.spinner?.fail()
    throw error
  }
}

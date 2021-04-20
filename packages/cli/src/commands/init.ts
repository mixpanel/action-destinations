import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import ora from 'ora'
import path from 'path'
import slugify from 'slugify'
import { autoPrompt } from '../prompt'
import { renderTemplates } from '../templates'
import GenerateTypes from './generate/types'

export default class Init extends Command {
  private spinner: ora.Ora = ora()

  static description = `
    Scaffolds a new integration with a template. This does not register or deploy the integration.
  `

  static examples = [
    `$ segment init my-integration`,
    `$ segment init my-integration --directory packages/destination-actions --template basic-auth`
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
    directory: flags.string({ char: 'd', description: 'target directory to scaffold the integration', default: '.' }),
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
    const templatePath = path.join(__dirname, '../../templates/destinations', template)

    try {
      this.spinner.start(`Creating ${chalk.bold(name)}`)
      renderTemplates(templatePath, targetDirectory, answers)
      this.spinner.succeed(`Scaffold integration`)
    } catch (err) {
      this.spinner.fail(`Scaffold integration: ${chalk.red(err.message)}`)
      this.exit()
    }

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
    if (this.spinner?.isSpinning) {
      this.spinner.fail()
    }
    throw error
  }
}

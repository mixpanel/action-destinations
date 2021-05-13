import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import globby from 'globby'
import { camelCase, capitalize } from 'lodash'
import ora from 'ora'
import path from 'path'
import { autoPrompt } from 'src/prompt'
import { renderTemplates } from '../../templates'
import GenerateTypes from './types'

export default class GenerateAction extends Command {
  private spinner: ora.Ora = ora()

  static description = `Scaffolds a new integration action.`

  static examples = [
    `$ segment generate:action ACTION`,
    `$ segment generate:action postToChannel --directory ./destinations/slack`
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
    force: flags.boolean({ char: 'f' }),
    title: flags.boolean({ char: 't', description: 'the display name of the action' }),
    directory: flags.string({ char: 'd', description: 'base directory to scaffold the action' })
  }

  static args = [{ name: 'name', description: 'the action name', required: true }]

  async run() {
    const { args, flags } = this.parse(GenerateAction)

    // TODO make this configurable
    const integrationsGlob = './packages/destination-actions/src/destinations/*'
    const integrationDirs = await globby(integrationsGlob, {
      expandDirectories: false,
      onlyDirectories: true,
      gitignore: true,
      ignore: ['node_modules']
    })

    const answers = await autoPrompt(flags, [
      {
        type: 'text',
        name: 'title',
        message: 'Action title:',
        initial: capitalize(args.name)
      },
      {
        type: 'select',
        name: 'directory',
        message: 'Which integration (directory)?',
        choices: integrationDirs.map((integrationPath) => {
          const [name] = integrationPath.split(path.sep).reverse()
          return {
            title: name,
            value: integrationPath
          }
        })
      }
    ])

    const slug = camelCase(args.name)
    const directory = answers.directory || './'
    const relativePath = path.join(directory, slug)
    const targetDirectory = path.join(process.cwd(), relativePath)
    const templatePath = path.join(__dirname, '../../../templates/actions/empty-action')

    try {
      this.spinner.start(`Creating ${chalk.bold(args.name)}`)
      renderTemplates(
        templatePath,
        targetDirectory,
        {
          name: answers.title,
          description: '',
          slug
        },
        flags.force
      )
      this.spinner.succeed(`Scaffold action`)
    } catch (err) {
      this.spinner.fail(`Scaffold action: ${chalk.red(err.message)}`)
      this.exit()
    }

    // TODO get types working for actions again
    try {
      this.spinner.start(chalk`Generating types for {magenta ${slug}} action`)
      await GenerateTypes.run(['--path', directory])
      this.spinner.succeed()
    } catch (err) {
      this.spinner.fail(chalk`Generating types for {magenta ${slug}} action: ${err.message}`)
    }

    this.log(chalk.green(`Done creating "${args.name}" 🎉`))
    this.log(chalk.green(`Start coding! cd ${targetDirectory}`))
  }

  async catch(error: unknown) {
    if (this.spinner?.isSpinning) {
      this.spinner.fail()
    }
    throw error
  }
}

import { Command, flags } from '@oclif/command'
import chalk from 'chalk'
import { camelCase } from 'lodash'
import ora from 'ora'
import path from 'path'
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
    directory: flags.string({ char: 'd', description: 'base directory to scaffold the action', default: './' })
  }

  static args = [{ name: 'name', description: 'the action name', required: true }]

  async run() {
    const { args, flags } = this.parse(GenerateAction)
    const slug = camelCase(args.name)

    const relativePath = path.join(flags.directory, slug)
    const targetDirectory = path.join(process.cwd(), relativePath)
    const templatePath = path.join(__dirname, '../../../templates/actions/empty-action')

    try {
      this.spinner.start(`Creating ${chalk.bold(args.name)}`)
      renderTemplates(
        templatePath,
        targetDirectory,
        {
          name: args.name,
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
      await GenerateTypes.run(['--path', flags.directory])
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

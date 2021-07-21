import { Command, flags } from '@oclif/command'
import globby from 'globby'
import ora from 'ora'
import path from 'path'
import os from 'os'
import slugify from 'slugify'
import { loadDestination } from '../lib/destinations'
import { controlPlaneService } from '../lib/control-plane-service'
import type { CreateDestinationMetadataInput, DestinationMetadataOptions } from '../lib/control-plane-service'
import { autoPrompt, prompt } from '../lib/prompt'

const NOOP_CONTEXT = {}

export default class Register extends Command {
  private spinner: ora.Ora = ora()

  static description = `Creates a new integration on Segment.`

  static examples = [`$ ./bin/run register`]

  static flags = {
    help: flags.help({ char: 'h' })
  }

  async run() {
    const { flags } = this.parse(Register)

    // `register` requires typescript support to parse TypeScript source files
    // This is needed if we don't want to require developers compile the project first.
    // Note: we aren't using transpileOnly because we do want this to fail if there are type errors.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call
    require('ts-node').register({ emit: false, transpileOnly: true })

    // TODO support a command flag for this
    const integrationsGlob = './packages/destination-actions/src/destinations/*'
    const integrationDirs = await globby(integrationsGlob, {
      expandDirectories: false,
      onlyDirectories: true,
      gitignore: true,
      ignore: ['node_modules']
    })

    const { selectedDestination } = await autoPrompt<{ selectedDestination: { path: string; name: string } }>(flags, {
      type: 'select',
      name: 'selectedDestination',
      message: 'Which integration?',
      choices: integrationDirs.map((integrationPath) => {
        const [name] = integrationPath.split(path.sep).reverse()
        return {
          title: name,
          value: { path: integrationPath, name }
        }
      })
    })

    if (!selectedDestination) {
      this.warn('You must choose a destination. Exiting.')
      this.exit()
    }

    this.spinner.start(`Introspecting definition`)
    const destination = await loadDestination(selectedDestination.path)

    if (!destination) {
      this.spinner.fail()
      this.warn('No destination definition found. Exiting.')
      this.exit()
    } else {
      this.spinner.succeed()
    }

    const name = `Actions ${destination.name}`
    const slug = slugify(destination.slug ?? name).toLowerCase()

    if (destination.slug && destination.slug !== slug) {
      this.warn(`Your destination slug does not meet the requirements. Try \`${slug}\` instead`)
      this.exit()
    }

    // Ensure we don't already have a destination with this slug...
    await this.isDestinationSlugAvailable(slug)

    this.spinner.start(`Preparing destination definition`)

    // We store the destination-level JSON Schema in an option with key `metadata`
    // Currently this is needed to render the UI views for action destinations
    const initialOptions: DestinationMetadataOptions = {
      // This setting is required until we switch off the legacy "data model"
      subscriptions: {
        label: 'subscriptions',
        type: 'string',
        scope: 'event_destination',
        private: false,
        encrypt: false,
        hidden: false,
        validators: [['required', `The subscriptions property is required.`]]
      }
    }

    const definition: CreateDestinationMetadataInput['input'] = {
      name,
      slug,
      type: 'action_destination',
      description: destination.description ?? '',
      status: 'PRIVATE_BUILDING',
      methods: {
        pageview: true,
        identify: true,
        alias: true,
        track: true,
        group: true
      },
      platforms: {
        browser: false,
        mobile: false,
        server: true
      },
      options: initialOptions,
      basicOptions: Object.keys(initialOptions)
    }

    this.spinner.succeed()

    this.log(`Please review the definition before continuing:`)
    this.log(`\n${JSON.stringify(definition, null, 2)}`)

    // Loosely verify that we are on the production workbench
    const hostname = os.hostname()
    if (!hostname.startsWith('workbench-') || !hostname.includes('-production-')) {
      this.warn(`You must be logged into a production workbench to register your destination. Exiting.`)
      this.exit()
    }

    const { shouldContinue } = await prompt({
      type: 'confirm',
      name: 'shouldContinue',
      message: `Do you want to register "${name}"?`,
      initial: false
    })

    if (!shouldContinue) {
      this.log('Exiting without registering.')
    }

    await this.createDestinationMetadata(definition)
  }

  async catch(error: unknown) {
    if (this.spinner?.isSpinning) {
      this.spinner.fail()
    }
    throw error
  }

  private async isDestinationSlugAvailable(slug: string): Promise<boolean> {
    this.spinner.start(`Checking availability for ${slug}`)

    const { error } = await controlPlaneService.getDestinationMetadataBySlug(NOOP_CONTEXT, { slug })
    if (error?.statusCode === 404) {
      this.spinner.succeed()
      return true
    } else if (error) {
      this.spinner.fail()
      this.error(`Error checking availablity for ${slug}: ${error.message}`)
    } else {
      this.spinner.warn()
      this.warn(`There is already a destination with the slug "${slug}". Exiting.`)
      this.exit()
    }
  }

  private async createDestinationMetadata(input: CreateDestinationMetadataInput['input']): Promise<void> {
    this.spinner.start(`Registering ${input.name}`)

    const { data, error } = await controlPlaneService.createDestinationMetadata(NOOP_CONTEXT, { input })

    if (data?.metadata) {
      this.spinner.succeed()
      this.log(`Successfully registered destination with id:`)
      this.log(`\n${data.metadata.id}`)
    } else {
      this.spinner.fail()
      this.error(`Error registering destination: ${error?.message}`)
    }
  }
}

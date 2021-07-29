import { Command, flags } from '@oclif/command'
import execa from 'execa'
import chalk from 'chalk'
import { destinations } from '@segment/browser-destinations'
import ora from 'ora'
import type { RemotePlugin } from '../lib/control-plane-service'
import { prompt } from '../lib/prompt'
import {
  getDestinationMetadatas,
  getRemotePluginByDestinationIds,
  persistRemotePlugin
} from '../lib/control-plane-client'

export default class PushBrowserDestinations extends Command {
  private spinner: ora.Ora = ora()

  static description = `Builds and uploads browser destinations to Segment's database and s3 instance. Requires \`robo stage.ssh\` or \`robo prod.ssh\` and platform-write access.`

  static examples = [`$ ./bin/run push-browser-destinations`]

  static flags = {
    help: flags.help({ char: 'h' })
  }

  static args = []

  async run() {
    const { destinationIds } = await prompt<{ destinationIds: string[] }>({
      type: 'multiselect',
      name: 'destinationIds',
      message: 'Browser Destinations:',
      choices: Object.entries(destinations).map(([id, definition]) => ({
        title: definition.definition.name,
        value: id
      }))
    })

    if (!destinationIds.length) {
      this.warn(`You must select at least one destination. Exiting...`)
      this.exit()
    }

    this.spinner.start(
      `Fetching existing definitions for ${destinationIds
        .map((id) => chalk.greenBright(destinations[id].definition.name))
        .join(', ')}...`
    )
    const metadatas = await getDestinationMetadatas(destinationIds)

    this.spinner.stop()

    const notFound = destinationIds.filter((destId) => !metadatas.map((m) => m.id).includes(destId))
    if (notFound.length) {
      this.log(`Could not find destination definitions for ${notFound.map((id) => destinations[id].definition.name)}.`)
    }

    const remotePlugins: RemotePlugin[] = await getRemotePluginByDestinationIds(destinationIds)

    try {
      this.spinner.start(`Building libraries`)
      await build()
    } catch (e) {
      this.error(e)
    } finally {
      this.spinner.stop()
    }

    for (const metadata of metadatas) {
      this.spinner.start('Persisting remote plugins...')
      const plugins: RemotePlugin[] = remotePlugins.filter((p) => p.metadataId === metadata.id)

      let persistedPlugins = []
      try {
        persistedPlugins = await persistRemotePlugin(metadata, plugins)
      } catch (e) {
        this.error(e)
      } finally {
        this.spinner.stop()
      }

      this.log(`Plugin ${persistedPlugins.map((p) => p.name)} stored in control plane`)
    }

    try {
      this.spinner.start(`Syncing all plugins to s3`)
      await syncToS3()
      this.spinner.stop()
      this.log(`Plugins synced to s3`)
    } catch (e) {
      this.spinner.stop()
      this.error(e)
    }
  }
}

async function build(): Promise<string> {
  execa.commandSync('lerna run --scope @segment/actions-core build')
  if (process.env.NODE_ENV === 'stage') {
    return execa.commandSync('lerna run build-web-stage').stdout
  }

  return execa.commandSync('lerna run build-web').stdout
}

async function syncToS3(): Promise<string> {
  if (process.env.NODE_ENV === 'production') {
    const command = `lerna run deploy-prod`
    return execa.commandSync(command).stdout
  }

  if (process.env.NODE_ENV === 'stage') {
    const command = `lerna run deploy-stage`
    return execa.commandSync(command).stdout
  }

  return 'Nothing to upload.'
}

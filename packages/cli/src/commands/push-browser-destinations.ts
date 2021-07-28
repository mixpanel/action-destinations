import { Command, flags } from '@oclif/command'
import execa from 'execa'
import chalk from 'chalk'
import { browserDestinationsIdToSlug as idToSlug } from '@segment/destination-actions'
import { invert } from 'lodash'
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
    const slugToId = invert(idToSlug)
    const availableSlugs = Object.keys(slugToId)
    const { chosenSlugs } = await prompt<{ chosenSlugs: string[] }>({
      type: 'multiselect',
      name: 'chosenSlugs',
      message: 'Browser Destinations:',
      choices: availableSlugs.map((s) => ({
        title: s,
        value: s
      }))
    })

    const destinationIds: string[] = []
    for (const slug of chosenSlugs) {
      const id = slugToId[slug]
      destinationIds.push(id)
    }

    if (!destinationIds.length) {
      this.warn(`You must select at least one destination. Exiting...`)
      this.exit()
    }

    this.spinner.start(
      `Fetching existing definitions for ${chosenSlugs.map((slug) => chalk.greenBright(slug)).join(', ')}...`
    )
    const [metadatas] = await Promise.all([getDestinationMetadatas(destinationIds)])
    this.spinner.stop()

    const notFound = destinationIds.filter((destId) => !metadatas.map((m) => m.id).includes(destId))
    if (notFound.length) {
      this.log(`Could not find destination definitions for ${notFound.map((id) => idToSlug[id])}.`)
    }

    const remotePlugins: RemotePlugin[] = await getRemotePluginByDestinationIds(destinationIds)

    for (const metadata of metadatas) {
      this.spinner.start('Persisting remote plugins...')
      const plugins: RemotePlugin[] = remotePlugins.filter((p) => p.metadataId === metadata.id)

      let persistedPlugins = []
      try {
        persistedPlugins = await persistRemotePlugin(metadata, plugins)
      } catch (e) {
        this.error(e)
      }

      this.spinner.stop()

      this.log(`Plugin ${persistedPlugins.map((p) => p.name)} stored in control plane`)
    }

    try {
      this.spinner.start(`Building libraries`)
      await build()
      this.spinner.stop()
    } catch (e) {
      this.error(e)
    }

    try {
      this.spinner.start(`Syncing all plugins to s3`)
      await syncToS3(chosenSlugs)
      this.spinner.stop()

      this.log(`Plugins synced to s3`)
    } catch (e) {
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

async function syncToS3(slugs: string[]): Promise<string> {
  if (slugs.length) {
    const includes = slugs.map((s) => `--include ${s}*`).join(' ')
    const options = `-- --exclude * ${includes}`

    if (process.env.NODE_ENV === 'production') {
      const command = `lerna run deploy-prod ${options}`
      return execa.commandSync(command).stdout
    }

    if (process.env.NODE_ENV === 'stage') {
      const command = `lerna run deploy-stage ${options}`
      return execa.commandSync(command).stdout
    }
  }

  return 'Nothing to upload.'
}

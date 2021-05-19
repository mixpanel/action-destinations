import { Command, flags } from '@oclif/command'
import { fieldsToJsonSchema, InputField } from '@segment/actions-core'
import chokidar from 'chokidar'
import fs from 'fs-extra'
import globby from 'globby'
import { compile } from 'json-schema-to-typescript'
import path from 'path'
import prettier from 'prettier'
import { loadDestination } from '../../lib/destinations'

const pretterOptions = prettier.resolveConfig.sync(process.cwd())

export default class GenerateTypes extends Command {
  static description = `Generates TypeScript definitions for an integration.`

  static examples = [
    `$ segment generate:types`,
    `$ segment generate:types --path ./packages/*/src/destinations/*/index.ts`
  ]

  // Allow variable length args (to work with tools like lint-staged)
  static strict = false

  static flags = {
    help: flags.help({ char: 'h' }),
    path: flags.string({
      char: 'p',
      description: 'file path for the integration(s). Accepts glob patterns.',
      multiple: true
    }),
    watch: flags.boolean({ char: 'w', description: 'Watch for file changes to regenerate types' })
  }

  static args = []

  async run() {
    const { flags } = this.parse(GenerateTypes)

    const globs = flags.path || ['./packages/*/src/destinations/*/index.ts']
    const files = await globby(globs, {
      expandDirectories: false,
      gitignore: true,
      ignore: ['node_modules']
    })

    for (const file of files) {
      await this.handleFile(file)
    }

    if (flags.watch) {
      const dirsToWatch = files.map((file) => path.dirname(file))

      const watcher = chokidar.watch(dirsToWatch, {
        cwd: process.cwd(),
        ignored: '**/*/generated-types.ts'
      })

      watcher.on('change', (filePath) => {
        this.debug(`Regenerating types for ${filePath} ..`)

        // Find matching parent directory for the entrypoint file
        const parentDir = dirsToWatch.find((parent) => {
          const relative = path.relative(parent, filePath)
          return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
        })
        if (!parentDir) {
          return
        }

        this.handleFile(parentDir).catch((error) => {
          this.debug(`Error generating types for ${filePath}: ${error.message}`)
        })
      })

      watcher.on('error', (error) => {
        this.error(`Error: ${error.message}`)
      })

      watcher.once('ready', () => {
        this.log('Watching files for changes ..')
      })
    }
  }

  async handleFile(file: string): Promise<void> {
    const destination = await loadDestination(file).catch((error) => {
      this.debug(`Couldn't load ${file}: ${error.message}`)
      return null
    })

    if (!destination) {
      return
    }

    const stats = fs.statSync(file)
    const parentDir = stats.isDirectory() ? file : path.dirname(file)
    const types = await generateTypes(destination.authentication?.fields, 'Settings')
    fs.writeFileSync(path.join(parentDir, './generated-types.ts'), types)

    // TODO how to load directory structure consistently?
    for (const [slug, action] of Object.entries(destination.actions)) {
      const types = await generateTypes(action.fields, 'Payload')
      if (fs.pathExistsSync(path.join(parentDir, `${slug}`))) {
        fs.writeFileSync(path.join(parentDir, slug, 'generated-types.ts'), types)
      } else {
        fs.writeFileSync(path.join(parentDir, `./${slug}.types.ts`), types)
      }
    }
  }
}

async function generateTypes(fields: Record<string, InputField> = {}, name: string) {
  const schema = fieldsToJsonSchema(fields)

  return compile(schema, name, {
    bannerComment: '// Generated file. DO NOT MODIFY IT BY HAND.',
    style: pretterOptions ?? undefined
  })
}

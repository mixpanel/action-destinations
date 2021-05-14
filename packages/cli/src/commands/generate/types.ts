import { Command, flags } from '@oclif/command'
import { fieldsToJsonSchema, InputField } from '@segment/actions-core'
import fs from 'fs-extra'
import globby from 'globby'
import { compile } from 'json-schema-to-typescript'
import path from 'path'
import prettier from 'prettier'
import { loadDestination } from '../../destinations'

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
    })
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
      const destination = await loadDestination(file).catch((error) => {
        this.debug(`Couldn't load ${file}: ${error.message}`)
        return null
      })

      if (!destination) {
        continue
      }

      const directory = path.dirname(file)
      const types = await generateTypes(destination.authentication?.fields, 'Settings')
      fs.writeFileSync(path.join(directory, './generated-types.ts'), types)

      // TODO how to load directory structure consistently?
      for (const [slug, action] of Object.entries(destination.actions)) {
        const types = await generateTypes(action.fields, 'Payload')
        if (fs.pathExistsSync(path.join(directory, `${slug}`))) {
          fs.writeFileSync(path.join(directory, slug, 'generated-types.ts'), types)
        } else {
          fs.writeFileSync(path.join(directory, `./${slug}.types.ts`), types)
        }
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

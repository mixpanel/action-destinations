import '../src/aliases'
import { compile } from 'json-schema-to-typescript'
import { Options as PrettierOptions } from 'prettier'
import pkg from '../package.json'
import path from 'path'
import fs from 'fs'
import { destinations } from '@/destinations'
import { JSONSchema4 } from 'json-schema'

const COMMENT = '// Generated file. DO NOT MODIFY IT BY HAND.'
const root = path.join(__dirname, '..')
const destinationsPath = path.join(root, 'src/destinations')

async function run() {
  for (const destination in destinations) {
    const destinationDefinition = destinations[destination]
    if (!destinationDefinition.schema) {
      continue
    }

    const generated = await compile(destinationDefinition.schema as JSONSchema4, 'Settings', {
      style: pkg.prettier as PrettierOptions,
      bannerComment: COMMENT
    })

    const writePath = path.join(destinationsPath, destination, 'generated-types.ts')
    fs.writeFileSync(writePath, generated)

    for (const action in destinationDefinition.actions) {
      const actionDefinition = destinationDefinition.actions[action]

      const generated = await compile(actionDefinition.schema as JSONSchema4, '', {
        style: pkg.prettier as PrettierOptions,
        bannerComment: COMMENT
      })

      const writePath = path.join(destinationsPath, destination, action, 'generated-types.ts')
      fs.writeFileSync(writePath, generated)
    }
  }
}

run()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

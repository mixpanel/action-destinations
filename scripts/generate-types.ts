import '../src/aliases'
import fs from 'fs'
import { JSONSchema4 } from 'json-schema'
import { compile } from 'json-schema-to-typescript'
import path from 'path'
import { Options as PrettierOptions } from 'prettier'
import { DestinationDefinition } from '@/lib/destination-kit'
import { ActionDefinition } from '@/lib/destination-kit/action'
import pkg from '../package.json'

const COMMENT = '// Generated file. DO NOT MODIFY IT BY HAND.'
const destinationsPath = path.join(__dirname, '..', 'src/destinations')

const destinations = fs.readdirSync(destinationsPath).filter((file) => {
  return fs.statSync(path.join(destinationsPath, file)).isDirectory()
})

async function run() {
  for (const destination of destinations) {
    const destinationPath = path.join(destinationsPath, destination)
    const destinationDefinition: DestinationDefinition = (await import(destinationPath)).default

    if (!destinationDefinition.schema) {
      continue
    }

    const generated = await compile(destinationDefinition.schema as JSONSchema4, 'Settings', {
      style: pkg.prettier as PrettierOptions,
      bannerComment: COMMENT
    })

    const writePath = path.join(destinationsPath, destination, 'generated-types.ts')
    fs.writeFileSync(writePath, generated)

    const actions = fs.readdirSync(destinationPath)
    for (const action of actions) {
      const actionPath = path.join(destinationPath, action)
      const stats = fs.statSync(actionPath)
      if (!stats.isDirectory() || action === 'autocomplete') {
        continue
      }

      const actionDefinition: ActionDefinition<unknown> = (await import(actionPath)).default
      if (!actionDefinition.schema) {
        continue
      }

      const generated = await compile(actionDefinition.schema as JSONSchema4, 'Payload', {
        style: pkg.prettier as PrettierOptions,
        bannerComment: COMMENT
      })

      const writePath = path.join(actionPath, 'generated-types.ts')
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

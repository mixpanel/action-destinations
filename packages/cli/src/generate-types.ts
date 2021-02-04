import fs from 'fs'
import { compile } from 'json-schema-to-typescript'
import path from 'path'
import prettier from 'prettier'
import { DestinationDefinition, ActionDefinition, fieldsToJsonSchema } from '@segment/destination-actions'

const COMMENT = '// Generated file. DO NOT MODIFY IT BY HAND.'
const destinationsPath = path.join(__dirname, '../../destination-actions', 'src/destinations')

const destinations = fs.readdirSync(destinationsPath).filter((file) => {
  return fs.statSync(path.join(destinationsPath, file)).isDirectory()
})

async function run() {
  const prettierOptions = (await prettier.resolveConfig(path.resolve(__dirname, '../../../package.json'))) ?? undefined

  for (const destination of destinations) {
    const destinationPath = path.join(destinationsPath, destination)
    const destinationDefinition: DestinationDefinition = (await import(destinationPath)).default

    const destinationSettingSchema = destinationDefinition.authentication?.fields
    if (!destinationSettingSchema) {
      continue
    }

    const generated = await compile(fieldsToJsonSchema(destinationSettingSchema), 'Settings', {
      bannerComment: COMMENT,
      style: prettierOptions
    })

    const writePath = path.join(destinationsPath, destination, 'generated-types.ts')
    fs.writeFileSync(writePath, generated)

    const actions = fs.readdirSync(destinationPath)
    for (const action of actions) {
      const actionPath = path.join(destinationPath, action)
      const stats = fs.statSync(actionPath)
      if (!stats.isDirectory() || action === 'autocomplete' || action === '__tests__') {
        continue
      }

      const actionDefinition: ActionDefinition<unknown> = (await import(actionPath)).default
      if (!actionDefinition.fields) {
        continue
      }

      const generated = await compile(fieldsToJsonSchema(actionDefinition.fields), 'Payload', {
        bannerComment: COMMENT,
        style: prettierOptions
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

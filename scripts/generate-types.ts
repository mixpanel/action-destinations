import { compileFromFile } from 'json-schema-to-typescript'
import { Options as PrettierOptions } from 'prettier'
import pkg from '../package.json'
import path from 'path'
import fs from 'fs'

const COMMENT = '// Generated file. DO NOT MODIFY IT BY HAND.'
const root = path.join(__dirname, '..')
const destinationsPath = path.join(root, 'src/destinations')

async function run() {
  const destinations = fs.readdirSync(destinationsPath)

  for (const destination of destinations) {
    const destinationPath = path.join(destinationsPath, destination)
    const stats = fs.lstatSync(destinationPath)

    const isDirectory = stats.isDirectory()
    if (isDirectory) {
      await generateSettings(destinationPath)
      await generatePayloads(destinationPath)
    }
  }
}

async function generateSettings(destinationPath: string): Promise<void> {
  const settingsPath = path.join(destinationPath, 'settings.schema.json')

  const settingsExists = fs.existsSync(settingsPath)
  if (!settingsExists) {
    return
  }

  const generated = await compileFromFile(settingsPath, {
    style: pkg.prettier as PrettierOptions,
    bannerComment: COMMENT
  })

  const writePath = path.join(destinationPath, 'generated-types.ts')

  fs.writeFileSync(writePath, generated)
}

async function generatePayloads(destinationPath: string): Promise<void> {
  const actions = fs.readdirSync(destinationPath)

  for (const action of actions) {
    const actionPath = path.join(destinationPath, action)
    const payloadPath = path.join(actionPath, 'payload.schema.json')

    const payloadExists = fs.existsSync(payloadPath)
    if (!payloadExists) {
      continue
    }

    const generated = await compileFromFile(payloadPath, {
      style: pkg.prettier as PrettierOptions,
      bannerComment: COMMENT
    })

    const writePath = path.join(actionPath, 'generated-types.ts')

    fs.writeFileSync(writePath, generated)
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

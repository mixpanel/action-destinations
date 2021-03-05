import {
  idToSlug,
  destinations as actionDestinations,
  DestinationDefinition,
  fieldsToJsonSchema,
  jsonSchemaToFields,
  ActionDefinition
} from '@segment/destination-actions'
import chalk from 'chalk'
import { Dictionary, invert, pick, uniq } from 'lodash'
import ControlPlaneService, {
  DestinationMetadata,
  DestinationMetadataOptions,
  DestinationMetadataUpdateInput
} from '@segment/control-plane-service-client'
import { diffString } from 'json-diff'
import { JSONSchema4 } from 'json-schema'
import ora from 'ora'
import prompts from 'prompts'

const promptOptions = {
  onCancel() {
    console.log('Exiting...')
    process.exit(0)
  }
}

const controlPlaneService = new ControlPlaneService({
  name: 'control-plane-service',
  url: 'http://control-plane-service.segment.local',
  userAgent: 'Segment (fab-5)',
  timeout: 10000,
  headers: {
    // All calls from this script are system-to-system and shouldn't require authz checks
    'skip-authz': '1'
  }
})

interface PromptAnswers {
  chosenSlugs: string[]
}

type DefinitionJson = Omit<DestinationDefinition, 'actions' | 'extendRequest' | 'authentication'> & {
  authentication?: Omit<NonNullable<DestinationDefinition['authentication']>, 'testAuthentication'>
  actions: {
    [slug: string]: Omit<ActionDefinition<unknown>, 'perform' | 'autocompleteFields' | 'cachedFields'>
  }
}

let spinner: ora.Ora

/**
 * This script syncs our json schema settings for each destination and its actions into the corresponding destination metadata.
 *
 * Usage:
 *
 *    $ robo stage.ssh // or prod.ssh
 *    $ goto fab-5-engine
 *    $ yarn run sync-json-schemas
 */

async function run() {
  const slugToId = invert(idToSlug)
  const availableSlugs = Object.keys(slugToId)
  const { chosenSlugs }: PromptAnswers = await prompts(
    {
      type: 'multiselect',
      name: 'chosenSlugs',
      message: 'Destinations:',
      choices: availableSlugs.map((s) => ({
        title: s,
        value: s
      }))
    },
    promptOptions
  )

  if (!chosenSlugs) {
    return
  }

  const destinationIds: string[] = []
  for (const slug of chosenSlugs) {
    const id = slugToId[slug]
    destinationIds.push(id)
  }

  console.log('')
  spinner = ora()
  spinner.start(`Fetching existing definitions for ${chosenSlugs.map((slug) => chalk.greenBright(slug)).join(', ')}...`)

  const schemasByDestination = getJsonSchemas(actionDestinations, destinationIds, slugToId)
  const metadatas = await getDestinationMetadatas(destinationIds)

  if (metadatas.length !== Object.keys(schemasByDestination).length) {
    spinner.fail()
    throw new Error('Number of metadatas must match number of schemas')
  }

  spinner.stop()

  const promises = []
  for (const metadata of metadatas) {
    const schemaForDestination = schemasByDestination[metadata.id]
    const slug = schemaForDestination.slug

    console.log('')
    console.log(`${chalk.bold.whiteBright(slug)}`)
    spinner.start(`Generating diff for ${chalk.bold(slug)}...`)

    const options = getOptions(metadata, schemaForDestination)
    const basicOptions = getBasicOptions(metadata, options)
    const settingsDiff = diffString(
      asJson(pick(metadata, ['basicOptions', 'options'])),
      asJson({ basicOptions, options })
    )

    const oldDefinition = settingsToDefinition(metadata, schemaForDestination.definition)
    const newDefinition = definitionToJson(schemaForDestination.definition)
    const definitionDiff = diffString(oldDefinition, newDefinition)

    if (definitionDiff) {
      spinner.warn(`Detected definition diff for ${chalk.bold(schemaForDestination.slug)}, please review:`)
      console.log(`\n${definitionDiff}`)
    } else if (settingsDiff) {
      spinner.warn(`Detected settings diff for ${chalk.bold(schemaForDestination.slug)}, please review:`)
      console.log(`\n${settingsDiff}`)
    } else {
      spinner.info(`No change for ${chalk.bold(schemaForDestination.slug)}. Skipping.`)
      continue
    }

    const { shouldContinue } = await prompts(
      {
        type: 'confirm',
        name: 'shouldContinue',
        message: `Publish change for ${slug}?`,
        initial: false
      },
      promptOptions
    )

    if (!shouldContinue) {
      continue
    }

    promises.push(
      updateDestinationMetadata(metadata.id, {
        basicOptions,
        options
      })
    )
  }

  await Promise.all(promises)
}

function asJson(obj: unknown) {
  if (typeof obj !== 'object' || Array.isArray(obj) || obj === null) {
    return obj
  }

  const newObj: Record<string, unknown> = { ...obj }
  for (const key of Object.keys(newObj)) {
    let value = newObj[key]
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value)
      } catch (_err) {
        // do nothing
      }
    }
    newObj[key] = asJson(value)
  }

  return newObj
}

function definitionToJson(definition: DestinationDefinition) {
  // Create a copy that only includes serializable properties
  const copy = JSON.parse(JSON.stringify(definition))

  for (const action of Object.keys(copy.actions)) {
    delete copy.actions[action]?.autocompleteFields
    delete copy.actions[action]?.cachedFields
  }

  return copy
}

function settingsToDefinition(
  { basicOptions, options }: DestinationMetadata,
  definition: DestinationDefinition
): DefinitionJson {
  const existingDefinition: DefinitionJson = {
    name: definition.name,
    actions: {}
  }

  // grab the destination-level definition from the `metadata` option
  if (typeof options.metadata?.description === 'string') {
    const meta = JSON.parse(options.metadata.description) as { settings: JSONSchema4 }

    // pull out authentication-related fields from a JSON Schema-looking thing
    const authFields = jsonSchemaToFields(meta?.settings)

    if (Object.keys(authFields).length > 0) {
      existingDefinition.authentication = {
        scheme: definition.authentication?.scheme ?? 'custom',
        fields: authFields
      }
    }
  }

  // find actions based on the naming scheme `action${slug}` in the `basicOptions`
  const actionSlugs = basicOptions
    .filter((option) => option.startsWith('action'))
    .map((option) => option.replace(/^action/, ''))

  for (const slug of actionSlugs) {
    const meta = JSON.parse(options[`action${slug}`]?.description ?? 'null')
    if (!meta) continue

    existingDefinition.actions[slug] = {
      title: meta.schema?.title,
      description: meta.schema?.description,
      // backwards compat for now
      defaultSubscription: meta.defaultSubscription ?? meta.schema?.defaultSubscription,
      recommended: meta.recommended,
      fields: jsonSchemaToFields(meta.schema)
    }
  }

  // Remove undefined values
  return JSON.parse(JSON.stringify(existingDefinition))
}

function getBasicOptions(metadata: DestinationMetadata, options: DestinationMetadataOptions): string[] {
  return uniq([...metadata.basicOptions, ...Object.keys(options)])
}

function getOptions(metadata: DestinationMetadata, destinationSchema: DestinationSchema): DestinationMetadataOptions {
  const options: DestinationMetadataOptions = { ...metadata.options }

  // We store the destination-level JSON Schema in an option with key `metadata`
  options.metadata = {
    default: '',
    description: JSON.stringify({
      name: destinationSchema.name,
      slug: destinationSchema.slug,
      settings: destinationSchema.jsonSchema
    }),
    encrypt: false,
    hidden: false,
    label: `Destination Metadata`,
    private: false,
    scope: 'event_destination',
    type: 'string',
    validators: []
  }

  // We store each action-level JSON Schema in separate options
  for (const actionPayload of destinationSchema.actions) {
    options[`action${actionPayload.slug}`] = {
      default: '',
      description: JSON.stringify({
        slug: actionPayload.slug,
        schema: actionPayload.jsonSchema,
        defaultSubscription: actionPayload.defaultSubscription,
        recommended: actionPayload.recommended,
        // TODO figure out if `settings` property is used anywhere
        settings: []
      }),
      encrypt: false,
      hidden: false,
      label: `Action Metadata: ${actionPayload.slug}`,
      private: false,
      scope: 'event_destination',
      type: 'string',
      validators: []
    }
  }

  const requiredProperties = (destinationSchema.jsonSchema?.required as string[]) ?? []
  const properties = destinationSchema.jsonSchema?.properties ?? {}
  for (const name in properties) {
    const property = properties[name]

    if (typeof property === 'boolean') {
      continue
    }

    const validators: string[][] = []

    if (requiredProperties.includes(name)) {
      validators.push(['required', `The ${name} property is required.`])
    }

    options[name] = {
      default: '',
      description: property.description,
      encrypt: false,
      hidden: false,
      label: property.title,
      private: true,
      scope: 'event_destination',
      type: 'string',
      validators
    }
  }

  return options
}

async function getDestinationMetadatas(destinationIds: string[]): Promise<DestinationMetadata[]> {
  const { data, error } = await controlPlaneService.getAllDestinationMetadatas(
    {},
    {
      byIds: destinationIds
    }
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Could not load metadatas')
  }

  return data.metadatas
}

async function updateDestinationMetadata(
  destinationId: string,
  input: DestinationMetadataUpdateInput
): Promise<DestinationMetadata> {
  const { data, error } = await controlPlaneService.updateDestinationMetadata(
    {},
    {
      destinationId,
      input
    }
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Could not update metadata')
  }

  return data.metadata
}

interface SchemasByDestination {
  [destinationId: string]: DestinationSchema
}

interface DestinationSchema {
  name: string
  slug: string
  jsonSchema: JSONSchema4 | undefined
  actions: Action[]
  definition: DestinationDefinition
}

interface Action {
  slug: string
  recommended: boolean
  defaultSubscription?: string
  jsonSchema: JSONSchema4
}

function getJsonSchemas(
  destinations: Record<string, DestinationDefinition<unknown>>,
  destinationIds: string[],
  slugToId: Dictionary<string>
): SchemasByDestination {
  const schemasByDestination: SchemasByDestination = {}

  for (const destinationSlug in destinations) {
    const destinationId = slugToId[destinationSlug]
    if (!destinationIds.includes(destinationId)) {
      continue
    }

    const actionPayloads: Action[] = []
    const destination = destinations[destinationSlug]

    const actions = destination.actions
    for (const actionSlug in actions) {
      const action = actions[actionSlug]
      actionPayloads.push({
        slug: actionSlug,
        recommended: action.recommended,
        defaultSubscription: action.defaultSubscription,
        jsonSchema: {
          title: action.title,
          description: action.description,
          // For parity with what is happening today
          defaultSubscription: action.defaultSubscription,
          ...fieldsToJsonSchema(action.fields)
        }
      })
    }

    schemasByDestination[destinationId] = {
      name: destination.name,
      slug: destinationSlug,
      jsonSchema: fieldsToJsonSchema(destination.authentication?.fields),
      actions: actionPayloads,
      definition: destination
    }
  }

  return schemasByDestination
}

run()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

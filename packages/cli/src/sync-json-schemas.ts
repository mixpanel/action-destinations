import {
  idToSlug,
  destinations as actionDestinations,
  DestinationDefinition,
  ActionSchema,
  fieldsToJsonSchema
} from '@segment/destination-actions'
import { Dictionary, invert, uniq } from 'lodash'
import ControlPlaneService, {
  DestinationMetadata,
  DestinationMetadataOptions,
  DestinationMetadataUpdateInput
} from '@segment/control-plane-service-client'
import { JSONSchema4 } from 'json-schema'
import prompts from 'prompts'

const controlPlaneService = new ControlPlaneService({
  name: 'control-plane-service',
  url: 'http://control-plane-service.segment.local',
  userAgent: 'Segment (fab-5)',
  headers: {
    // All calls from this script are system-to-system and shouldn't require authz checks
    'skip-authz': '1'
  }
})

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
  const { chosenSlugs } = await prompts({
    type: 'multiselect',
    name: 'chosenSlugs',
    message: 'Destinations:',
    choices: availableSlugs.map((s) => ({
      title: s,
      value: s
    }))
  })

  if (!chosenSlugs) {
    return
  }

  const destinationIds: string[] = []
  for (const slug of chosenSlugs) {
    const id = slugToId[slug]
    destinationIds.push(id)
  }

  const schemasByDestination = getJsonSchemas(actionDestinations, destinationIds, slugToId)
  const metadatas = await getDestinationMetadatas(destinationIds)

  if (metadatas.length !== Object.keys(schemasByDestination).length) {
    throw new Error('Number of metadatas must match number of schemas')
  }

  const promises = []

  for (const metadata of metadatas) {
    console.log(`Syncing ${metadata.slug}`)

    const schemaForDestination = schemasByDestination[metadata.id]
    const basicOptions = getBasicOptions(metadata, schemaForDestination)
    const options = getOptions(metadata, schemaForDestination)

    promises.push(
      updateDestinationMetadata(metadata.id, {
        basicOptions,
        options
      })
    )
  }

  await Promise.all(promises)
}

function getBasicOptions(metadata: DestinationMetadata, destinationSchema: DestinationSchema): string[] {
  const basicOptions: string[] = []

  for (const actionPayload of destinationSchema.actions) {
    basicOptions.push(`action${actionPayload.slug}`)
  }

  return uniq([...metadata.basicOptions, ...basicOptions, 'metadata'])
}

function getOptions(metadata: DestinationMetadata, destinationSchema: DestinationSchema): DestinationMetadataOptions {
  const options: DestinationMetadataOptions = { ...metadata.options }

  // We store the destination-level JSONSchema in an option with key `metadata`
  options.metadata = {
    default: '',
    description: JSON.stringify({
      name: destinationSchema.name,
      slug: destinationSchema.slug,
      settings: destinationSchema.schema
    }),
    encrypt: false,
    hidden: false,
    label: `Destination Metadata`,
    private: false,
    scope: 'event_destination',
    type: 'string',
    validators: []
  }

  // We store each action-level JSONSchema in separate options
  for (const actionPayload of destinationSchema.actions) {
    options[`action${actionPayload.slug}`] = {
      default: '',
      description: JSON.stringify({
        slug: actionPayload.slug,
        schema: actionPayload.schema,
        recommended: actionPayload.recommended,
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

  const requiredProperties = (destinationSchema.schema?.required as string[]) ?? []
  const properties = destinationSchema.schema?.properties ?? {}
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
  schema: JSONSchema4 | undefined
  actions: Action[]
}

interface Action {
  slug: string
  recommended: boolean
  schema: ActionSchema<unknown> & { title: string; description: string }
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
        schema: {
          title: action.title,
          description: action.description,
          ...action.schema
        }
      })
    }

    schemasByDestination[destinationId] = {
      name: destination.name,
      slug: destinationSlug,
      schema: fieldsToJsonSchema(destination.authentication?.fields),
      actions: actionPayloads
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

import { Command, flags } from '@oclif/command'
import type { DestinationDefinition } from '@segment/actions-core'
import { idToSlug, destinations as actionDestinations } from '@segment/destination-actions'
import chalk from 'chalk'
import { invert, uniq, pick, omit, sortBy } from 'lodash'
import type { Dictionary } from 'lodash'
import { diffString } from 'json-diff'
import ora from 'ora'
import type {
  DestinationMetadata,
  DestinationMetadataActionCreateInput,
  DestinationMetadataActionFieldCreateInput,
  DestinationMetadataActionsUpdateInput,
  DestinationMetadataOptions,
  DestinationSubscriptionPresetFields,
  DestinationSubscriptionPresetInput
} from '../lib/control-plane-service'
import { prompt } from '../lib/prompt'
import { OAUTH_OPTIONS, OAUTH_SCHEME, RESERVED_FIELD_NAMES } from '../constants'
import {
  getDestinationMetadatas,
  getDestinationMetadataActions,
  updateDestinationMetadata,
  updateDestinationMetadataActions,
  createDestinationMetadataActions,
  setSubscriptionPresets
} from '../lib/control-plane-client'

type BaseActionInput = Omit<DestinationMetadataActionCreateInput, 'metadataId'>

export default class Push extends Command {
  private spinner: ora.Ora = ora()

  static description = `Introspects your integration definition to build and upload your integration to Segment. Requires \`robo stage.ssh\` or \`robo prod.ssh\`.`

  static examples = [`$ ./bin/run push`]

  static flags = {
    help: flags.help({ char: 'h' }),
    force: flags.boolean({ char: 'f' })
  }

  static args = []

  async run() {
    const { flags } = this.parse(Push)

    const slugToId = invert(idToSlug)
    const availableSlugs = Object.keys(slugToId)
    const { chosenSlugs } = await prompt<{ chosenSlugs: string[] }>({
      type: 'multiselect',
      name: 'chosenSlugs',
      message: 'Integrations:',
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
      this.warn(`You must select at least one destination. Exiting.`)
      this.exit()
    }

    this.spinner.start(
      `Fetching existing definitions for ${chosenSlugs.map((slug) => chalk.greenBright(slug)).join(', ')}...`
    )
    const schemasByDestination = getJsonSchemas(actionDestinations, destinationIds, slugToId)
    const [metadatas, actions] = await Promise.all([
      getDestinationMetadatas(destinationIds),
      getDestinationMetadataActions(destinationIds)
    ])

    if (metadatas.length !== Object.keys(schemasByDestination).length) {
      this.spinner.fail()
      throw new Error('Number of metadatas must match number of schemas')
    }

    this.spinner.stop()

    for (const metadata of metadatas) {
      const schemaForDestination = schemasByDestination[metadata.id]
      const slug = schemaForDestination.slug

      this.log('')
      this.log(`${chalk.bold.whiteBright(slug)}`)
      this.spinner.start(`Generating diff for ${chalk.bold(slug)}...`)

      const actionsToUpdate: DestinationMetadataActionsUpdateInput[] = []
      const actionsToCreate: DestinationMetadataActionCreateInput[] = []
      const existingActions = actions.filter((a) => a.metadataId === metadata.id)

      for (const [actionKey, action] of Object.entries(schemaForDestination.actions)) {
        // Note: this implies that changing the slug is a breaking change
        const existingAction = existingActions.find((a) => a.slug === actionKey && a.platform === 'cloud')

        const fields: DestinationMetadataActionFieldCreateInput[] = Object.keys(action.fields).map((fieldKey) => {
          const field = action.fields[fieldKey]
          return {
            fieldKey,
            type: field.type,
            label: field.label,
            description: field.description,
            defaultValue: field.default,
            required: field.required ?? false,
            multiple: field.multiple ?? false,
            // TODO implement
            choices: null,
            dynamic: field.dynamic ?? false,
            placeholder: field.placeholder ?? '',
            allowNull: field.allowNull ?? false
          }
        })

        const base: BaseActionInput = {
          slug: actionKey,
          name: action.title ?? 'Unnamed Action',
          description: action.description ?? '',
          platform: action.platform ?? 'cloud',
          hidden: action.hidden ?? false,
          defaultTrigger: action.defaultSubscription ?? null,
          fields
        }

        if (existingAction) {
          actionsToUpdate.push({ ...base, actionId: existingAction.id })
        } else {
          actionsToCreate.push({ ...base, metadataId: metadata.id })
        }
      }

      const hasBrowserActions = Object.values(schemaForDestination.actions).some((action) => action.platform === 'web')
      const hasCloudActions = Object.values(schemaForDestination.actions).some(
        (action) => !action.platform || action.platform === 'cloud'
      )
      const platforms = {
        browser: hasBrowserActions || hasCloudActions,
        server: hasCloudActions,
        mobile: false
      }

      const options = getOptions(metadata, schemaForDestination)
      const basicOptions = getBasicOptions(metadata, options)
      const diff = diffString(
        asJson({
          basicOptions: filterOAuth(metadata.basicOptions),
          options: pick(metadata.options, filterOAuth(Object.keys(options))),
          platforms: metadata.platforms,
          actions: sortBy(
            existingActions.map((action) => ({
              ...omit(action, ['id', 'metadataId', 'createdAt', 'updatedAt']),
              fields: action.fields?.map((field) =>
                omit(field, ['id', 'metadataActionId', 'sortOrder', 'createdAt', 'updatedAt'])
              )
            })),
            ['name']
          )
        }),
        asJson({
          basicOptions: filterOAuth(basicOptions),
          options: pick(options, filterOAuth(Object.keys(options))),
          platforms,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          actions: sortBy(
            ([] as Array<DestinationMetadataActionCreateInput | DestinationMetadataActionsUpdateInput>)
              .concat(actionsToUpdate, actionsToCreate)
              .map((action) => ({
                ...omit(action, ['id', 'actionId']),
                fields: action.fields?.map((field) =>
                  omit(field, ['id', 'metadataActionId', 'sortOrder', 'createdAt', 'updatedAt'])
                )
              })),
            ['name']
          )
        })
      )

      if (diff) {
        this.spinner.warn(`Detected changes for ${chalk.bold(slug)}, please review:`)
        this.log(`\n${diff}`)
      } else if (flags.force) {
        const newDefinition = definitionToJson(schemaForDestination)
        this.spinner.warn(`No change detected for ${chalk.bold(slug)}. Using force, please review:`)
        this.log(`\n${JSON.stringify(newDefinition, null, 2)}`)
      } else {
        this.spinner.info(`No change for ${chalk.bold(slug)}. Skipping.`)
        continue
      }

      const { shouldContinue } = await prompt({
        type: 'confirm',
        name: 'shouldContinue',
        message: `Publish change for ${slug}?`,
        initial: false
      })

      if (!shouldContinue) {
        continue
      }

      await Promise.all([
        updateDestinationMetadata(metadata.id, {
          basicOptions,
          options,
          platforms
        }),
        updateDestinationMetadataActions(actionsToUpdate),
        createDestinationMetadataActions(actionsToCreate)
      ])

      const allActions = await getDestinationMetadataActions([metadata.id])
      const presets: DestinationSubscriptionPresetInput[] = []

      for (const preset of schemaForDestination.presets ?? []) {
        const associatedAction = allActions.find((a) => a.slug === preset.partnerAction)
        if (!associatedAction) continue

        presets.push({
          actionId: associatedAction.id,
          name: preset.name ?? associatedAction.name,
          trigger: preset.subscribe,
          fields: (preset.mapping as DestinationSubscriptionPresetFields) ?? {}
        })
      }

      // We have to wait to do this until after the associated actions are created (otherwise it may fail)
      await setSubscriptionPresets(metadata.id, presets)
    }
  }
}

function filterOAuth(optionList: string[]) {
  return optionList.filter((item) => item !== 'oauth')
}

function asJson(obj: unknown) {
  return JSON.parse(JSON.stringify(obj))
}

function definitionToJson(definition: DestinationDefinition) {
  // Create a copy that only includes serializable properties
  const copy = JSON.parse(JSON.stringify(definition))

  for (const action of Object.keys(copy.actions)) {
    delete copy.actions[action].dynamicFields
    copy.actions[action].hidden = copy.actions[action].hidden ?? false
  }

  return copy
}

function getBasicOptions(metadata: DestinationMetadata, options: DestinationMetadataOptions): string[] {
  return uniq([...metadata.basicOptions, ...Object.keys(options)])
}

// Note: exporting for testing purposes only
export function getOptions(
  metadata: DestinationMetadata,
  destinationSchema: DestinationSchema
): DestinationMetadataOptions {
  const options: DestinationMetadataOptions = { ...metadata.options }

  for (const [fieldKey, schema] of Object.entries(destinationSchema.authentication?.fields ?? {})) {
    const validators: string[][] = []

    if (
      RESERVED_FIELD_NAMES.includes(fieldKey.toLowerCase()) &&
      destinationSchema.authentication?.scheme === OAUTH_SCHEME
    ) {
      throw new Error(`Schema contains a field definition that uses a reserved name: ${fieldKey}`)
    }

    if (schema.required) {
      validators.push(['required', `The ${fieldKey} property is required.`])
    }

    options[fieldKey] = {
      // Authentication-related fields don't support defaults yet
      default: '',
      description: schema.description,
      encrypt: false,
      hidden: false,
      label: schema.label,
      private: true,
      scope: 'event_destination',
      type: 'string',
      validators
    }
  }

  // Add oauth settings
  if (destinationSchema.authentication?.scheme === OAUTH_SCHEME) {
    options['oauth'] = OAUTH_OPTIONS
  }

  return options
}

interface SchemasByDestination {
  [destinationId: string]: DestinationSchema
}

export interface DestinationSchema extends DestinationDefinition {
  slug: string
}

function getJsonSchemas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  destinations: Record<string, DestinationDefinition<any>>,
  destinationIds: string[],
  slugToId: Dictionary<string>
): SchemasByDestination {
  const schemasByDestination: SchemasByDestination = {}

  for (const destinationSlug in destinations) {
    const destinationId = slugToId[destinationSlug]
    if (!destinationIds.includes(destinationId)) {
      continue
    }

    const definition = destinations[destinationSlug]

    schemasByDestination[destinationId] = {
      ...definition,
      slug: destinationSlug
    }
  }

  return schemasByDestination
}

import { validate, parseFql } from '@segment/fab5-subscriptions'
import { JSONSchema4 } from 'json-schema'
import { Action, ActionDefinition, Validate, RequestFn } from './action'
import { ExecuteInput, StepResult } from './step'
import { time, duration } from '../time'
import { JSONLikeObject, JSONObject } from '../json-object'
import { SegmentEvent } from '../segment-event'
import { fieldsToJsonSchema, jsonSchemaToFields } from './fields-to-jsonschema'
import { UnsupportedActionError } from '../errors'
import createRequestClient, { RequestClient } from '../create-request-client'
import type { ModifiedResponse } from '../types'
import type { InputField, RequestExtension } from './types'
import type { AllRequestOptions } from '../request-client'

export type { ActionDefinition, ExecuteInput, RequestFn }
export { fieldsToJsonSchema, jsonSchemaToFields }

export interface SubscriptionStats {
  duration: number
  destination: string
  action: string
  subscribe: string
  state: string
  input: JSONLikeObject
  output: StepResult[] | null
}

interface PartnerActions<Settings, Payload extends JSONLikeObject> {
  [key: string]: Action<Settings, Payload>
}

export interface DestinationDefinition<Settings = unknown> {
  /** The name of the destination */
  name: string
  /** An optional function to extend requests sent from the destination (including all actions) */
  extendRequest?: RequestExtension<Settings>
  /** Optional authentication configuration */
  authentication?: AuthenticationScheme<Settings>
  /** Actions */
  actions: {
    [key: string]: ActionDefinition<Settings>
  }
  /** Subscription presets automatically applied in quick setup */
  presets?: Subscription[]
}

export interface Subscription {
  name?: string
  partnerAction: string
  subscribe: string
  mapping?: JSONObject
}

interface TestAuthSettings<Settings> {
  settings: Settings
}

interface Authentication<Settings> {
  scheme: 'basic' | 'custom'
  fields: Record<string, InputField>
  testAuthentication: (request: RequestClient, input: TestAuthSettings<Settings>) => Promise<unknown> | unknown
}
export interface CustomAuthentication<Settings> extends Authentication<Settings> {
  /** Typically used for "API Key" authentication. */
  scheme: 'custom'
}

export interface BasicAuthentication<Settings> extends Authentication<Settings> {
  scheme: 'basic'
  // TODO evalute requiring "username" and "password" fields
  // and automatically handling the http auth stuff
  // fields: Record<'username' | 'password', InputField>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthenticationScheme<Settings = any> = BasicAuthentication<Settings> | CustomAuthentication<Settings>

interface EventInput<Settings> {
  readonly event: SegmentEvent
  readonly mapping: JSONObject
  readonly settings: Settings
}

export interface DecoratedResponse extends ModifiedResponse {
  request: Request
  options: AllRequestOptions
}

export class Destination<Settings = JSONObject> {
  readonly definition: DestinationDefinition<Settings>
  readonly name: string
  readonly authentication?: AuthenticationScheme<Settings>
  readonly extendRequest?: RequestExtension<Settings>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly actions: PartnerActions<Settings, any>
  readonly responses: DecoratedResponse[]
  readonly settingsSchema?: JSONSchema4

  constructor(destination: DestinationDefinition<Settings>) {
    this.definition = destination
    this.name = destination.name
    this.extendRequest = destination.extendRequest
    this.actions = {}
    this.authentication = destination.authentication
    this.responses = []

    // Convert to complete JSON Schema
    if (this.authentication?.fields) {
      this.settingsSchema = fieldsToJsonSchema(this.authentication.fields)
    }

    for (const action of Object.keys(destination.actions)) {
      this.partnerAction(action, destination.actions[action])
    }
  }

  async testAuthentication(settings: Settings): Promise<void> {
    const context: ExecuteInput<Settings, {}> = { settings, payload: {}, cachedFields: {} }

    if (this.settingsSchema) {
      const step = new Validate('settings', this.settingsSchema)
      await step.executeStep(context)
    }

    if (!this.authentication?.testAuthentication) {
      return
    }

    const options = this.extendRequest?.(context) ?? {}
    const requestClient = createRequestClient(options)

    try {
      await this.authentication.testAuthentication(requestClient, { settings })
    } catch (error) {
      throw new Error('Credentials are invalid')
    }
  }

  private partnerAction(slug: string, definition: ActionDefinition<Settings>): Destination<Settings> {
    const action = new Action<Settings, {}>(definition, this.extendRequest)

    action.on('response', (response) => {
      if (response) {
        this.responses.push(response)
      }
    })

    this.actions[slug] = action

    return this
  }

  protected executeAction(
    actionSlug: string,
    { event, mapping, settings }: EventInput<Settings>
  ): Promise<StepResult[]> {
    const action = this.actions[actionSlug]
    if (!action) {
      throw new UnsupportedActionError(actionSlug)
    }

    return action.execute({
      cachedFields: {},
      mapping,
      payload: event,
      settings
    })
  }

  private async onSubscription(
    subscription: Subscription,
    event: SegmentEvent,
    settings: Settings,
    onComplete?: (stats: SubscriptionStats) => void
  ): Promise<StepResult[]> {
    const subscriptionStartedAt = time()
    const actionSlug = subscription.partnerAction
    const input = {
      event,
      mapping: subscription.mapping || {},
      settings
    }

    let state = 'pending'
    let results: StepResult[] | null = null

    try {
      if (typeof subscription.subscribe !== 'string') {
        state = 'skipped'
        results = [{ output: 'invalid subscription' }]
        return results
      }

      const isSubscribed = validate(parseFql(subscription.subscribe), event)
      if (!isSubscribed) {
        state = 'skipped'
        results = [{ output: 'not subscribed' }]
        return results
      }

      results = await this.executeAction(actionSlug, input)
      state = 'done'

      return results
    } catch (error) {
      state = 'errored'
      results = [{ error }]
      throw error
    } finally {
      const subscriptionEndedAt = time()
      const subscriptionDuration = duration(subscriptionStartedAt, subscriptionEndedAt)

      onComplete?.({
        duration: subscriptionDuration,
        destination: this.name,
        action: actionSlug,
        subscribe: subscription.subscribe,
        state,
        input: {
          event: (input.event as unknown) as JSONLikeObject,
          mapping: input.mapping,
          settings: (input.settings as unknown) as JSONLikeObject
        },
        output: results
      })
    }
  }

  /**
   * Note: Until we move subscriptions upstream (into int-consumer) we've opted
   * to have failures abort the set of subscriptions and get potentially retried by centrifuge
   */
  public async onEvent(
    event: SegmentEvent,
    settings: JSONObject,
    onComplete?: (stats: SubscriptionStats) => void
  ): Promise<StepResult[]> {
    const subscriptions = this.getSubscriptions(settings)
    const destinationSettings = this.getDestinationSettings(settings)

    const promises = subscriptions.map((subscription) =>
      this.onSubscription(subscription, event, destinationSettings, onComplete)
    )

    const results = await Promise.all(promises)

    return ([] as StepResult[]).concat(...results)
  }

  private getSubscriptions(settings: JSONObject): Subscription[] {
    const { subscription, subscriptions } = settings
    let parsedSubscriptions

    // To support event tester we need to parse and validate multiple subscriptions from the settings
    if (subscription) {
      parsedSubscriptions = [subscription]
    } else if (typeof subscriptions === 'string') {
      parsedSubscriptions = JSON.parse(subscriptions)
    } else if (Array.isArray(subscriptions)) {
      parsedSubscriptions = subscriptions
    } else {
      parsedSubscriptions = []
    }

    return parsedSubscriptions as Subscription[]
  }

  private getDestinationSettings(settings: JSONObject): Settings {
    const { subcription, subscriptions, ...otherSettings } = settings
    return (otherSettings as unknown) as Settings
  }
}

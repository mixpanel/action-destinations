import { validate, parseFql, Subscription as SubscriptionAst } from '@segment/fab5-subscriptions'
import { BadRequest } from 'http-errors'
import got, { CancelableRequest, Got, Response } from 'got'
import { JSONSchema7 } from 'json-schema'
import { Action, ActionDefinition, Validate, Extension } from './action'
import { ExecuteInput, StepResult } from './step'
import Context, { Subscriptions } from '../context'
import { time, duration } from '../time'
import { JSONArray, JSONObject } from '../json-object'
import { redactSettings } from '../redact'

interface PartnerActions<Settings, Payload> {
  [key: string]: Action<Settings, Payload>
}

export interface DestinationDefinition<Settings = unknown> {
  /** The name of the destination */
  name: string
  /** The JSON Schema representing the destination settings. When present will be used to validate settings */
  schema?: JSONSchema7
  /** An optional function to extend requests sent from the destination (including all actions) */
  extendRequest?: Extension<Settings, any>
  /** Optional authentication configuration */
  authentication?: AuthenticationScheme<Settings>
  /** Actions */
  actions: {
    [key: string]: ActionDefinition<Settings>
  }
}

interface Subscription {
  partnerAction: string
  subscribe: string | SubscriptionAst
  mapping?: JSONObject
}

interface TestAuthSettings<Settings> {
  settings: Settings
}

interface AuthenticationField {
  /** The name of the field */
  key: string
  /** The display name of the field */
  label: string
  /** The datatype of the value */
  type: 'string'
  /** Whether or not the field is required for authentication */
  required: boolean
  /** Help text describing the field and how it is used (or why it is required). */
  description?: string
}

interface Authentication {
  fields?: AuthenticationField[]
}

interface ApiKeyAuthentication<Settings> extends Authentication {
  /** Typically used for "API Key" authentication. */
  type: 'custom'
  testAuthentication: (req: Got, input: TestAuthSettings<Settings>) => CancelableRequest<Response<string>>
}

type AuthenticationScheme<Settings = any> = ApiKeyAuthentication<Settings>

function instrumentSubscription(context: Context, input: Subscriptions): void {
  context.append('subscriptions', {
    duration: input.duration,
    destination: input.destination,
    action: input.action,
    input: input.input,
    output: input.output
  })
}

export class Destination<Settings = any> {
  readonly name: string
  readonly settingsSchema?: JSONSchema7
  readonly extendRequest?: Extension<Settings, any>

  // TODO Authentication should be required including creating a test request?
  readonly authentication?: AuthenticationScheme<Settings>

  partnerActions: PartnerActions<Settings, any>
  responses: Response[]

  constructor(destination: DestinationDefinition<Settings>) {
    this.name = destination.name
    this.settingsSchema = destination.schema
    this.extendRequest = destination.extendRequest
    this.partnerActions = {}
    this.authentication = destination.authentication
    this.responses = []

    for (const action of Object.keys(destination.actions)) {
      this.partnerAction(action, destination.actions[action])
    }
  }

  async testAuthentication(settings: Settings): Promise<void> {
    const context: ExecuteInput<Settings, {}> = { settings, payload: {}, cachedFields: {} }

    if (this.settingsSchema) {
      const step = new Validate('', 'settings', this.settingsSchema)
      await step.executeStep(context)
    }

    if (!this.authentication) {
      return
    }

    let request = got.extend({
      retry: 0,
      timeout: 3000,
      headers: {
        'user-agent': undefined
      }
    })

    if (typeof this.extendRequest === 'function') {
      request = request.extend(this.extendRequest(context))
    }

    try {
      await this.authentication.testAuthentication(request, { settings })
    } catch (error) {
      throw new Error('Credentials are invalid')
    }
  }

  // TODO refactor this whole thing
  private partnerAction(slug: string, definition: ActionDefinition<Settings>): Destination<Settings> {
    const action = new Action<Settings, {}>()

    if (this.extendRequest) {
      action.extendRequest(this.extendRequest)
    }

    action.on('response', (response) => {
      this.responses.push(response)
    })

    this.partnerActions[slug] = action.loadDefinition(definition)

    return this
  }

  private async onSubscription(
    context: Context,
    subscription: Subscription,
    event: JSONObject,
    settings: Settings,
    privateSettings: JSONArray
  ): Promise<StepResult[]> {
    const subscriptionAst: SubscriptionAst =
      typeof subscription.subscribe === 'string' ? parseFql(subscription.subscribe) : subscription.subscribe

    const isSubscribed = validate(subscriptionAst, event)
    if (!isSubscribed) {
      return [{ output: 'not subscribed' }]
    }

    const actionSlug = subscription.partnerAction
    const action = this.partnerActions[actionSlug]
    if (!action) {
      throw new BadRequest(`"${actionSlug}" is not a valid action`)
    }

    const subscriptionStartedAt = time()

    const input: ExecuteInput<Settings, {}> = {
      // Payload starts as the event itself, but will get transformed based on the given `mapping` + `event`
      // In other arbitrary actions (like autocomplete) payload may be non-event data
      //
      // TODO: evaluate if actions like autocomplete should be defined the same, and have the same semantics as a normal partner action
      // these are effectively actions that power UI **inputs** and nothing else.
      payload: event,
      mapping: subscription.mapping,
      settings,
      cachedFields: {}
    }

    const results = await action.execute(input)

    const subscriptionEndedAt = time()
    const subscriptionDuration = duration(subscriptionStartedAt, subscriptionEndedAt)

    instrumentSubscription(context, {
      duration: subscriptionDuration,
      destination: this.name,
      action: actionSlug,
      input: {
        ...input,
        settings: redactSettings((settings as unknown) as JSONObject, privateSettings)
      },
      output: results
    })

    return results
  }

  /**
   * Note: Until we move subscriptions upstream (into int-consumer) we've opted
   * to have failures abort the set of subscriptions and get potentially retried by centrifuge
   */
  public async onEvent(
    context: Context,
    event: JSONObject,
    settings: JSONObject,
    privateSettings: JSONArray = []
  ): Promise<StepResult[]> {
    const subscriptions = this.getSubscriptions(settings)
    const destinationSettings = this.getDestinationSettings(settings)

    const promises = subscriptions.map((s) =>
      this.onSubscription(context, s, event, destinationSettings, privateSettings)
    )

    const results = await Promise.all(promises)

    return results.flat()
  }

  private getSubscriptions(settings: JSONObject): Subscription[] {
    const { subscription, subscriptions } = settings
    let parsedSubscriptions

    // TODO remove all `else`s once https://github.com/segmentio/refinery/pull/635 lands
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
    const { subscriptions, ...otherSettings } = settings
    return (otherSettings as unknown) as Settings
  }
}

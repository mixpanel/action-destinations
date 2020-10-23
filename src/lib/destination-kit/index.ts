import validate from '@segment/fab5-subscriptions'
import { BadRequest } from 'http-errors'
import got, { CancelableRequest, Got, Response } from 'got'
import { JSONSchema7 } from 'json-schema'
import { Action, Validate, Extension } from './action'
import { ExecuteInput, StepResult } from './step'
import Context, { Subscriptions } from '../context'
import { time, duration } from '../time'
import { JSONArray, JSONObject } from '../json-object'
import { redactSettings } from '../redact'

export interface DestinationConfig<Settings = any> {
  /** The name of the destination */
  name: string
  /** The JSON Schema representing the destination settings. When present will be used to validate settings */
  schema?: JSONSchema7
  /** An optional function to extend requests sent from the destination (including all actions) */
  extendRequest?: Extension<Settings, any>
  /** Optional authentication configuration */
  authentication?: AuthenticationScheme<Settings>
}

interface Subscription {
  partnerAction: string
  subscribe:
    | string
    | {
        type: string
      }
  mapping?: JSONObject
}

interface PartnerActions<Settings, Payload> {
  [key: string]: Action<Settings, Payload>
}

interface TestAuthSettings<Settings> {
  settings: Settings
}

interface ApiKeyAuthentication<Settings> {
  type: 'API Key',
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

  // TODO Authentication should be included in part of the destination configuration including creating a test request
  readonly authentication?: AuthenticationScheme<Settings>

  partnerActions: PartnerActions<Settings, any>
  responses: Response[]

  constructor(config: DestinationConfig<Settings>) {
    this.name = config.name
    this.settingsSchema = config.schema
    this.extendRequest = config.extendRequest
    this.partnerActions = {}
    this.authentication = config.authentication
    this.responses = []
  }

  async testAuthentication(settings: Settings): Promise<void> {
    const context: ExecuteInput<Settings, {}> = { settings, payload: {}, cacheIds: {} }

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

  public partnerAction(
    slug: string,
    actionFn: (action: Action<Settings, any>) => Action<Settings, any>
  ): Destination<Settings> {
    const action = new Action<Settings, {}>()

    if (this.extendRequest) {
      action.extendRequest(this.extendRequest)
    }

    action.on('response', response => {
      this.responses.push(response)
    })

    this.partnerActions[slug] = actionFn(action)

    return this
  }

  private async onSubscription(
    context: Context,
    subscription: Subscription,
    event: JSONObject,
    settings: Settings,
    privateSettings: JSONArray
  ): Promise<StepResult[]> {
    const isSubscribed = validate(subscription.subscribe, event)
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
      cacheIds: {}
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

    const promises = subscriptions.map(s =>
      this.onSubscription(context, s, event, destinationSettings, privateSettings)
    )

    const results = await Promise.all(promises)

    return results.flat()
  }

  getSubscriptions(settings: JSONObject): Subscription[] {
    const { subscriptions } = settings
    const parsedSubscriptions = typeof subscriptions === 'string' ? JSON.parse(subscriptions) : subscriptions
    return parsedSubscriptions as Subscription[]
  }

  getDestinationSettings(settings: JSONObject): Settings {
    const { subscriptions, ...otherSettings } = settings
    return (otherSettings as unknown) as Settings
  }
}

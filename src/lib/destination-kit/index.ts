import validate from '@segment/fab5-subscriptions'
import { BadRequest } from 'http-errors'
import got, { CancelableRequest, Got, Response } from 'got'
import { Extensions, Action, Validate, StepResult } from './action'
import Context, { Subscriptions } from '../context'
import { time, duration } from '../time'
import { JSONObject } from '../json-object'

export interface DestinationConfig {
  name: string
  defaultSubscriptions: Subscription[]
}

interface Subscription {
  partnerAction: string
  subscribe:
    | string
    | {
        type: string
      }
  settings?: JSONObject
  mapping?: JSONObject
}

interface PartnerActions {
  [key: string]: Action
}

interface TestAuth {
  type: string
  options: TestAuthOptions
}

interface TestAuthOptions {
  testCredentials: (req: Got, settings: TestAuthSettings) => CancelableRequest<Response<string>>
}

interface TestAuthSettings {
  settings: JSONObject
}

function instrumentSubscription(context: Context, input: Subscriptions): void {
  context.append('subscriptions', {
    duration: input.duration,
    destination: input.destination,
    action: input.action,
    input: input.input,
    output: input.output
  })
}

export class Destination {
  name: string
  defaultSubscriptions: Subscription[]
  partnerActions: PartnerActions
  requestExtensions: Extensions
  settingsSchema?: object
  auth?: TestAuth

  constructor(config: DestinationConfig) {
    // TODO validate config with JSON schema
    this.name = config.name
    this.defaultSubscriptions = config.defaultSubscriptions
    this.partnerActions = {}
    this.requestExtensions = []
    this.settingsSchema = undefined
    this.auth = undefined
  }

  extendRequest(...fns: Extensions): Destination {
    this.requestExtensions.push(...fns)
    return this
  }

  validateSettings(schema: object): Destination {
    this.settingsSchema = schema
    return this
  }

  apiKeyAuth(options: TestAuthOptions): Destination {
    this.auth = {
      type: 'apiKey',
      options
    }

    return this
  }

  async testCredentials(settings: JSONObject): Promise<void> {
    const context = { settings }

    if (this.settingsSchema) {
      new Validate('', 'settings', this.settingsSchema)._execute(context)
    }

    if (!this.auth) {
      return
    }

    const req = this.requestExtensions.reduce(
      (acc, fn) => acc.extend(fn(context)),
      got.extend({
        retry: 0,
        timeout: 3000,
        headers: {
          'user-agent': undefined
        }
      })
    )

    try {
      await this.auth.options.testCredentials(req, { settings })
    } catch (error) {
      throw new Error('Credentials are invalid')
    }
  }

  // TODO move slug and description to action.json files
  partnerAction(slug: string, fn: Function): Destination {
    const a = new Action().extendRequest(...this.requestExtensions)
    this.partnerActions[slug] = fn(a)
    return this
  }

  private async runSubscription(
    context: Context,
    subscription: Subscription,
    payload: JSONObject,
    settings: JSONObject
  ): Promise<StepResult[]> {
    const isSubscribed = validate(subscription.subscribe, payload)
    if (!isSubscribed) {
      return [
        {
          output: 'not subscribed'
        }
      ]
    }

    const actionSlug = subscription.partnerAction
    const action = this.partnerActions[actionSlug]
    if (!action) {
      throw new BadRequest(`"${actionSlug}" is not a valid action`)
    }

    const subscriptionStartedAt = time()

    const input = {
      payload,
      settings: {
        ...settings,
        ...subscription.settings
      },
      mapping: subscription.mapping
    }

    const result = await action._execute(input)

    const subscriptionEndedAt = time()
    const subscriptionDuration = duration(subscriptionStartedAt, subscriptionEndedAt)

    instrumentSubscription(context, {
      duration: subscriptionDuration,
      destination: this.name,
      action: actionSlug,
      input,
      output: result
    })

    return result
  }

  /**
   * Note: Until we move subscriptions upstream (into int-consumer) we've opted
   * to have failures abort the set of subscriptions and get potentially retried by centrifuge
   */
  public async onEvent(context: Context, event: JSONObject, settings: JSONObject = {}): Promise<StepResult[]> {
    const subscriptions = getSubscriptions(settings)
    const destinationSettings = getDestinationSettings(settings)

    const promises = subscriptions.map(s => this.runSubscription(context, s, event, destinationSettings))

    const results = await Promise.all(promises)

    return results.flat()
  }
}

function getSubscriptions(settings: JSONObject): Subscription[] {
  const { subscriptions } = settings

  const parsedSubscriptions = typeof subscriptions === 'string' ? JSON.parse(subscriptions) : subscriptions

  return parsedSubscriptions as Subscription[]
}

function getDestinationSettings(settings: JSONObject): JSONObject {
  const { subscriptions, ...otherSettings } = settings

  return otherSettings
}

import validate from '@segment/fab5-subscriptions'
import { Extensions, Action, Validate } from './action'
import got, { CancelableRequest, Got, Response } from 'got'

export interface DestinationConfig {
  name: string
  defaultSubscriptions: SubscriptionConfig[]
}

interface SubscriptionConfig {
  subscribe:
    | string
    | {
        type: string
      }
  partnerAction: string
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function allSettled(promises: any): any {
  if (Promise.allSettled) {
    return Promise.allSettled(promises)
  }

  return Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    promises.map((p: any) =>
      Promise.resolve(p).then(
        val => ({ status: 'fulfilled', value: val }),
        err => ({ status: 'rejected', reason: err })
      )
    )
  )
}

export class Destination {
  name: string
  defaultSubscriptions: SubscriptionConfig[]
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async testCredentials(settings: any): Promise<void> {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isSubscribed(subscribe: any, event: any): any {
    return validate(subscribe, event)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runSubscription(subscription: any, payload: any, destinationSettings: any): Promise<any> {
    if (!this.isSubscribed(subscription.subscribe, payload)) {
      return 'not subscribed'
    }

    const actionSlug = subscription.partnerAction
    const action = this.partnerActions[actionSlug]
    if (!action) {
      throw new Error(`"${actionSlug}" is not a valid action`)
    }

    console.log(`${actionSlug}: running`)

    // TODO better API for calling actionKit thingy
    const result = await action._execute({
      payload,
      settings: {
        ...destinationSettings,
        ...subscription.settings
      },
      mapping: subscription.mapping
    })

    console.log(`${actionSlug}: done! result:`, result)

    return result
  }

  // TODO kinda gross but lets run with it for now.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async onEvent(event: any, settings: any): Promise<any> {
    console.log('Running destination: ', this.name)

    const { subscriptions, ...settingsNoSubscriptions } = settings
    const parsedSubscriptions = JSON.parse(subscriptions)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promises = parsedSubscriptions.map((sub: any) => {
      return this.runSubscription(sub, event, settingsNoSubscriptions)
    })

    return allSettled(promises)
  }
}

const got = require('got')
const allSettled = require('promise.allsettled')
const validate = require('@segment/fab5-subscriptions')
const action = require('./action.js')
const { Validate } = action

class Destination {
  constructor(config) {
    // TODO validate config with JSON schema
    this.name = config.name
    this.defaultSubscriptions = config.defaultSubscriptions
    this.partnerActions = {}
    this.requestExtensions = []
    this.settingsSchema = undefined
    this.auth = undefined
  }

  extendRequest(...fns) {
    this.requestExtensions.push(...fns)
    return this
  }

  validateSettings(schema) {
    this.settingsSchema = schema
    return this
  }

  apiKeyAuth(options) {
    this.auth = {
      type: 'apiKey',
      options
    }

    return this
  }

  async testCredentials(settings) {
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
  partnerAction(slug, fn) {
    const a = action().extendRequest(...this.requestExtensions)
    this.partnerActions[slug] = fn(a)
    return this
  }

  // --

  _subscribed(subscribe, event) {
    return validate(subscribe, event)
  }

  async _runSubscription(subscription, payload, destinationSettings) {
    if (!this._subscribed(subscription.subscribe, payload)) {
      return 'not subscribed'
    }

    const actionSlug = subscription.partnerAction
    const action = this.partnerActions[actionSlug]
    if (!action) throw new Error(`"${actionSlug}" is not a valid action`)

    console.log(`${actionSlug}: running`)

    // TODO better API for calling actionKit thingy
    const result = await action._execute({
      payload,
      settings: { ...destinationSettings, ...subscription.settings },
      mapping: subscription.mapping
    })

    console.log(`${actionSlug}: done! result:`, result)

    return result
  }

  // TODO kinda gross but lets run with it for now.
  async onEvent(event, settings) {
    console.log('Running destination: ', this.name)

    const { subscriptions, ...settingsNoSubscriptions } = settings

    return allSettled(
      JSON.parse(subscriptions).map(sub =>
        this._runSubscription(sub, event, settingsNoSubscriptions)
      )
    ).then(results => {
      console.log('Results:', results)
    })
  }
}

module.exports = {
  destination: config => {
    return new Destination(config)
  }
}

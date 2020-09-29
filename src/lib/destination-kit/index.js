const allSettled = require('promise.allsettled')
const validate = require('@segment/fab5-subscriptions')
const action = require('./action.js')

class Destination {
  constructor(config) {
    // TODO validate config with JSON schema
    this.name = config.name
    this.defaultSubscriptions = config.defaultSubscriptions
    this.partnerActions = {}
    this.requestExtensions = []
  }

  extendRequest(...fns) {
    this.requestExtensions.push(...fns)
    return this
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

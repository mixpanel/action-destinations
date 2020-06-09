import validate from '@segment/fab5-subscriptions'

class Destination {
  constructor (config) {
    // TODO validate config with JSON schema
    this.name = config.name
    this.defaultSubscriptions = config.defaultSubscriptions
    this.partnerActions = {}
  }

  partnerAction (name, mod) {
    this.partnerActions[name] = mod.default || mod
    return this
  }

  // --

  _subscribed (subscribe, event) {
    return validate(subscribe, event)
  }

  async _runSubscription (subscription, payload, destinationSettings) {
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
  handler () {
    return async (event, settings) => {
      console.log('Running destination: ', this.name)

      const { subscriptions, ...settingsNoSubscriptions } = settings

      return allSettled(
        JSON.parse(subscriptions).map(sub => (
          this._runSubscription(sub, event, settingsNoSubscriptions)
        ))
      )
        .then((results) => {
          console.log('Results:', results)
        })
    }
  }
}

// Promise.allSettled isn't available in Node 10. It was added in 12.9.0, so
// we'll hack it here.
function allSettled (promises) {
  if (Promise.allSettled) return Promise.allSettled(promises)

  return Promise.all(
    promises.map((p) => Promise.resolve(p)
      .then(
        (val) => ({ status: 'fulfilled', value: val }),
        (err) => ({ status: 'rejected', reason: err })
      )
    )
  )
}

// TODO
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled rejection at: Promise', p, 'reason:', reason)
  throw new Error('TODO unhandled promise rejection')
})

global.destination = (config) => {
  return new Destination(config)
}

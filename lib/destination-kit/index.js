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

  // TODO I'm only supporting basic event type matching for now.
  _subscribed (subscription, event) {
    if (subscription.subscribe === 'all') return true
    if (subscription.subscribe.type === 'all') return true
    return event.type === subscription.subscribe.type
  }

  // Settings are keyed as <actionSlug><settingSlug>, so clean that up here.
  // We're doing a lot of weird things to jam settings in Destination Functions
  // for now.
  _parseSettings (actionSlug, settings) {
    const actionSettings = {}
    let actionMapping = null

    for (const k in settings) {
      const value = settings[k]
      if (k === `${actionSlug}Mapping`) {
        actionMapping = JSON.parse(value)
      } else if (k.indexOf(actionSlug) === 0) {
        actionSettings[k.slice(actionSlug.length)] = value
      } else {
        actionSettings[k] = value
      }
    }

    return [actionSettings, actionMapping]
  }

  async _runAction (actionSlug, payload, settings) {
    const action = this.partnerActions[actionSlug]
    if (!action) throw new Error(`"${actionSlug}" is not a valid action`)

    console.log(`${actionSlug}: running`)

    const [actionSettings, actionMapping] = this._parseSettings(actionSlug, settings)

    // TODO better API for calling actionKit thingy
    const result = await action._execute({
      payload,
      settings: actionSettings,
      customerMapping: actionMapping
    })

    console.log(`${actionSlug}: done! result:`, result)

    return result
  }

  // TODO kinda gross but lets run with it for now.
  handler () {
    return async (event, settings) => {
      console.log('Running destination: ', this.name)

      let subscriptions = this.defaultSubscriptions
      if (settings.subscriptions) subscriptions = JSON.parse(settings.subscriptions)
      const runningActions = []

      for (const subscription of subscriptions) {
        if (this._subscribed(subscription, event)) {
          runningActions.push(
            this._runAction(subscription.partnerAction, event, settings)
          )
        }
      }

      return allSettled(runningActions).then((results) => {
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

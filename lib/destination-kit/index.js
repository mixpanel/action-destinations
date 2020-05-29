const map = require('../mapping-kit')

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

  // TODO kinda gross but lets run with it for now.
  handler () {
    return async (event, rawSettings) => {
      console.log('Running destination: ', this.name)

      // TODO We're abusing the settings system to nest our JSON blob for now.
      const settings = JSON.parse(rawSettings.s)

      const runningActions = []

      // TODO support user-defined subscriptions
      this.defaultSubscriptions.forEach((subscription) => {
        if (subscribed(subscription, event)) {
          console.log(`${subscription.partnerAction}: subscribed, running action`)

          // TODO handle missing action
          const action = this.partnerActions[subscription.partnerAction]
          const mapping = (settings.mappings || {})[subscription.partnerAction]
          if (mapping) {
            console.log(`${subscription.partnerAction}: mapping`)
            // TODO rename to payload?
            event = map(mapping, { settings, event })
          }

          runningActions.push(
            // TODO better API for calling actionKit thingy
            action._execute({
              payload: event,
              settings: settings
            })
          )
        } else {
          console.log(`${subscription.partnerAction} not subscribed`)
        }
      })

      return allSettled(runningActions).then((results) => {
        console.log('Results:', results)
      })
    }
  }
}

// TODO I'm only supporting basic event type matching for now.
function subscribed (subscription, event) {
  if (subscription.subscribe === 'all') return true
  if (subscription.subscribe.type === 'all') return true
  return event.type === subscription.subscribe.type
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

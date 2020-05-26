// TODO Eventually this whole file should live outside of `destinations/slack`
//
// TODO Add in base settings.json config

const destination = require('./destination.json')

// TODO validate incoming settings:
// const destSettings = require('./settings.json')

// TODO dynamically load and, of course, play nice with webpack.
const partnerActions = {
  postToChannel: require('./postToChannel')
}

// TODO I'm only supporting basic event type matching for now.
function subscribed (subscription, event) {
  return event.type === subscription.subscribe.type
}

const transforms = {
  // TODO obviously this shouldn't be hard-coded. Mapping/transformations
  // library is next!
  postToChannel: function (event) {
    return {
      text: (event.properties || {}).text || 'Hello, world!',
      username: 'Fab 5 Slack Destination',
      icon_url: 'https://logo.clearbit.com/segment.com'
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

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled rejection at: Promise', p, 'reason:', reason)
  throw new Error('TODO unhandled promise rejection')
})

export default async function (event, settings) {
  console.log('Running destination: ', destination.name)

  const runningActions = []

  destination.defaultSubscriptions.forEach((subscription) => {
    if (subscribed(subscription, event)) {
      const action = partnerActions[subscription.partnerAction]
      const transform = transforms[subscription.partnerAction]

      console.log(`${subscription.partnerAction} subscribed, running action`)
      runningActions.push(
        // TODO better API for calling actionKit thingy
        action._execute({
          payload: transform(event),
          settings: JSON.parse(settings.s)
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

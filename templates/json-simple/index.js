const { destination } = require('../../lib/destination-kit')

module.exports = destination(require('./destination.json'))
  .extendRequest(({ settings }) => ({
    prefixUrl: settings.url,
    headers: {
      'User-Agent': 'Destinations/2.0'
    },
    responseType: 'json'
  }))

  // TODO do this automatically in a way that works with webpack
  .partnerAction('trackUser', require('./trackUser'))
  .partnerAction('complexTrackUser', require('./complexTrackUser'))

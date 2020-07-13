const { destination } = require('../../lib/destination-kit')

module.exports = destination(require('./destination.json'))
  .extendRequest(({ settings }) => ({
    prefixUrl: 'https://api2.amplitude.com/2/httpapi',
    json: {
      api_key: settings.apiKey,
      events: []
    }
  }))

  .partnerAction('trackUser', require('./trackUser'))

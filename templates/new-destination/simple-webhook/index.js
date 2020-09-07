const { destination } = require('../../lib/destination-kit')

module.exports = destination(require('./destination.json'))
  .extendRequest(({ settings }) => ({
    prefixUrl: settings.url,
    headers: {
      'User-Agent': 'Destinations/2.0',
    },
    responseType: 'json',
  }))

  .partnerAction('postWebhook', require('./postWebhook'))

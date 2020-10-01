const { destination } = require('../../lib/destination-kit')

module.exports = destination(require('./destination.json'))
  .validateSettings(require('./settings.schema.json'))
  .extendRequest(({ settings }) => ({
    headers: {
      'User-Agent': 'Segment/2.0',
      Authorization: `Bearer ${settings.apiKey}`
    },
    responseType: 'json'
  }))
  .partnerAction('createRecord', require('./createRecord'))

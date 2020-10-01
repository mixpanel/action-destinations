const { destination } = require('../../lib/destination-kit')

module.exports = destination(require('./destination.json'))
  .validateSettings(require('./settings.schema.json'))
  .extendRequest(({ settings }) => ({
    prefixUrl: 'https://api.sendgrid.com/v3/',
    headers: { Authorization: `Bearer ${settings.apiKey}` },
    responseType: 'json'
  }))
  .apiKeyAuth({
    testCredentials: req => req('user/profile')
  })

  // TODO do this automatically in a way that works with webpack
  .partnerAction('createList', require('./createList'))
  .partnerAction('createUpdateContact', require('./createUpdateContact'))
  .partnerAction('deleteContact', require('./deleteContact'))
  .partnerAction('removeContactFromList', require('./removeContactFromList'))

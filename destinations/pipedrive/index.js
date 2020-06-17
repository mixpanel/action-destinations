const { destination } = require('../../lib/destination-kit')

module.exports = destination(require('./destination.json'))
  // TODO do this automatically in a way that works with webpack
  .partnerAction('createUpdateOrganization', require('./createUpdateOrganization'))
  .partnerAction('createUpdatePerson', require('./createUpdatePerson'))
  .partnerAction('deletePerson', require('./deletePerson'))

  .extendRequest(({ settings }) => ({
    prefixUrl: `https://${settings.domain}.pipedrive.com/api/v1/`,
    searchParams: {
      api_token: settings.apiToken
    },
    responseType: 'json'
  }))

  .handler()

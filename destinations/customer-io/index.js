const { destination } = require('../../lib/destination-kit')

module.exports = destination(require('./destination.json'))
  // TODO do this automatically in a way that works with webpack
  .partnerAction('addPersonToSegment', require('./addPersonToSegment'))
  .partnerAction('createUpdateDevice', require('./createUpdateDevice'))
  .partnerAction('createUpdatePerson', require('./createUpdatePerson'))
  .partnerAction('removePersonFromSegment', require('./removePersonFromSegment'))
  .partnerAction('trackAnonymousEvent', require('./trackAnonymousEvent'))
  .partnerAction('trackEvent', require('./trackEvent'))
  .partnerAction('triggerCampaign', require('./triggerCampaign'))

  .extendRequest(({ settings }) => {
    const userPass = Buffer.from(`${settings.siteId}:${settings.apiKey}`)

    return {
      prefixUrl: 'https://track.customer.io/v1/api/',
      headers: {
        Authorization: `Basic ${userPass.toString('base64')}`
      },
      responseType: 'json'
    }
  })

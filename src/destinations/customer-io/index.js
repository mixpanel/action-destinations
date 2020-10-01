const { destination } = require('../../lib/destination-kit')

module.exports = destination(require('./destination.json'))
  .validateSettings(require('./settings.schema.json'))
  .extendRequest(({ settings }) => {
    const userPass = Buffer.from(`${settings.siteId}:${settings.apiKey}`)

    return {
      prefixUrl: 'https://track.customer.io/api/v1',
      headers: {
        Authorization: `Basic ${userPass.toString('base64')}`
      },
      responseType: 'json'
    }
  })
  .apiKeyAuth({
    testCredentials: (req, { settings }) => {
      return req('https://beta-api.customer.io/v1/api/segments', {
        prefixUrl: '',
        headers: {
          authorization: `Bearer ${settings.appApiKey}`
        }
      })
    }
  })

  // TODO do this automatically in a way that works with webpack
  .partnerAction('addPersonToSegment', require('./addPersonToSegment'))
  .partnerAction('createUpdateDevice', require('./createUpdateDevice'))
  .partnerAction('createUpdatePerson', require('./createUpdatePerson'))
  .partnerAction(
    'removePersonFromSegment',
    require('./removePersonFromSegment')
  )
  .partnerAction('trackAnonymousEvent', require('./trackAnonymousEvent'))
  .partnerAction('trackEvent', require('./trackEvent'))
  .partnerAction('triggerCampaign', require('./triggerCampaign'))

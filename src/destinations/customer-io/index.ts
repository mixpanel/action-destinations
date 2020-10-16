import { Destination } from '../../lib/destination-kit'

import config from './destination.json'
import settings from './settings.schema.json'
import addPersonToSegment from './addPersonToSegment'
import createUpdateDevice from './createUpdateDevice'
import createUpdatePerson from './createUpdatePerson'
import removePersonFromSegment from './removePersonFromSegment'
import trackAnonymousEvent from './trackAnonymousEvent'
import trackEvent from './trackEvent'
import triggerCampaign from './triggerCampaign'

export default function createDestination(): Destination {
  const destination = new Destination(config)
    .validateSettings(settings)

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

    .partnerAction('addPersonToSegment', addPersonToSegment)
    .partnerAction('createUpdateDevice', createUpdateDevice)
    .partnerAction('createUpdatePerson', createUpdatePerson)
    .partnerAction('removePersonFromSegment', removePersonFromSegment)
    .partnerAction('trackAnonymousEvent', trackAnonymousEvent)
    .partnerAction('trackEvent', trackEvent)
    .partnerAction('triggerCampaign', triggerCampaign)

  return destination
}

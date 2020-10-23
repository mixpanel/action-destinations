import { JSONSchema7 } from 'json-schema'
import { Destination } from '../../lib/destination-kit'

import settings from './settings.schema.json'
import addPersonToSegment from './addPersonToSegment'
import createUpdateDevice from './createUpdateDevice'
import createUpdatePerson from './createUpdatePerson'
import removePersonFromSegment from './removePersonFromSegment'
import trackAnonymousEvent from './trackAnonymousEvent'
import trackEvent from './trackEvent'
import triggerCampaign from './triggerCampaign'
import { Settings } from './generated-types'

export default function createDestination(): Destination<Settings> {
  const destination = new Destination<Settings>({
    name: 'Customer.io',
    authentication: {
      type: 'API Key',
      testAuthentication: (req, { settings }) => {
        return req('https://beta-api.customer.io/v1/api/segments', {
          prefixUrl: '',
          headers: {
            authorization: `Bearer ${settings.appApiKey}`
          }
        })
      }
    },
    // TODO get this from the database
    schema: settings as JSONSchema7,
    extendRequest({ settings }) {
      const userPass = Buffer.from(`${settings.siteId}:${settings.apiKey}`)

      return {
        prefixUrl: 'https://track.customer.io/api/v1',
        headers: {
          Authorization: `Basic ${userPass.toString('base64')}`
        },
        responseType: 'json'
      }
    }
  })

  destination.partnerAction('addPersonToSegment', addPersonToSegment)
  destination.partnerAction('createUpdateDevice', createUpdateDevice)
  destination.partnerAction('createUpdatePerson', createUpdatePerson)
  destination.partnerAction('removePersonFromSegment', removePersonFromSegment)
  destination.partnerAction('trackAnonymousEvent', trackAnonymousEvent)
  destination.partnerAction('trackEvent', trackEvent)
  destination.partnerAction('triggerCampaign', triggerCampaign)

  return destination
}

import { Destination } from '../../lib/destination-kit'

import config from './destination.json'
import settings from './settings.schema.json'
import createList from './createList'
import createUpdateContact from './createUpdateContact'
import deleteContact from './deleteContact'
import removeContactFromList from './removeContactFromList'

export default function createDestination(): Destination {
  const destination = new Destination(config)
    .validateSettings(settings)

    .extendRequest(({ settings }) => {
      return {
        prefixUrl: 'https://api.sendgrid.com/v3/',
        headers: { Authorization: `Bearer ${settings.apiKey}` },
        responseType: 'json'
      }
    })

    .apiKeyAuth({
      testCredentials: req => req('user/profile')
    })

    .partnerAction('createList', createList)
    .partnerAction('createUpdateContact', createUpdateContact)
    .partnerAction('deleteContact', deleteContact)
    .partnerAction('removeContactFromList', removeContactFromList)

  return destination
}

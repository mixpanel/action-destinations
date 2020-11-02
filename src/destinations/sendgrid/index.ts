import { JSONSchema7 } from 'json-schema'
import { Destination } from '../../lib/destination-kit'

import settings from './settings.schema.json'
import createList from './createList'
import createUpdateContact from './createUpdateContact'
import deleteContact from './deleteContact'
import removeContactFromList from './removeContactFromList'
import { Settings } from './generated-types'

export default function createDestination(): Destination<Settings> {
  const destination = new Destination<Settings>({
    name: 'SendGrid',
    // TODO get this from the database
    authentication: {
      type: 'custom',
      testAuthentication: req => req('user/profile')
    },
    // TODO get this from the database
    schema: settings as JSONSchema7,
    extendRequest({ settings }) {
      return {
        prefixUrl: 'https://api.sendgrid.com/v3/',
        headers: { Authorization: `Bearer ${settings.apiKey}` },
        responseType: 'json'
      }
    },

    actions: {
      createList,
      createUpdateContact,
      deleteContact,
      removeContactFromList
    }
  })

  return destination
}

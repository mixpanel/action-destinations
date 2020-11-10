import { JSONSchema7 } from 'json-schema'
import { DestinationDefinition } from '../../lib/destination-kit'
import settings from './settings.schema.json'
import createList from './createList'
import createUpdateContact from './createUpdateContact'
import deleteContact from './deleteContact'
import removeContactFromList from './removeContactFromList'
import { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: 'SendGrid',
  authentication: {
    type: 'custom',
    testAuthentication: (req) => req('user/profile')
  },
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
}

export default destination

import { DestinationDefinition } from '../../lib/destination-kit'
import createList from './createList'
import createUpdateContact from './createUpdateContact'
import removeContactFromList from './removeContactFromList'
import type { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: 'SendGrid',
  authentication: {
    type: 'custom',
    testAuthentication: (req) => req('user/profile')
  },
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    properties: {
      apiKey: {
        title: 'API Key',
        description:
          'SendGrid API key, created under the ["API Keys" tab](https://app.sendgrid.com/settings/api_keys) of the Settings page.',
        type: 'string',
        minLength: 32
      }
    },
    additionalProperties: false,
    required: ['apiKey']
  },
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
    removeContactFromList
  }
}

export default destination

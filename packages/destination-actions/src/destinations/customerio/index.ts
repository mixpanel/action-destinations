import { DestinationDefinition } from '../../lib/destination-kit'
import createUpdateDevice from './createUpdateDevice'
import createUpdatePerson from './createUpdatePerson'
import trackAnonymousEvent from './trackAnonymousEvent'
import trackEvent from './trackEvent'
import triggerCampaign from './triggerCampaign'
import type { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: 'Customer.io',
  authentication: {
    scheme: 'basic',
    fields: {
      siteId: {
        description:
          'Customer.io site ID. This can be found on your [API Credentials page](https://fly.customer.io/settings/api_credentials).',
        minLength: 20,
        title: 'Site ID',
        type: 'string',
        required: true
      },
      apiKey: {
        description:
          'Customer.io API key. This can be found on your [API Credentials page](https://fly.customer.io/settings/api_credentials).',
        minLength: 20,
        title: 'API Key',
        type: 'string',
        required: true
      }
    },
    testAuthentication: (req) => {
      return req('https://track.customer.io/auth', {
        // overwrite the main prefix url
        prefixUrl: ''
      })
    }
  },

  extendRequest({ settings }) {
    return {
      prefixUrl: 'https://track.customer.io/api/v1',
      username: settings.siteId,
      password: settings.apiKey,
      responseType: 'json'
    }
  },

  actions: {
    createUpdateDevice,
    createUpdatePerson,
    trackAnonymousEvent,
    trackEvent,
    triggerCampaign
  }
}

export default destination

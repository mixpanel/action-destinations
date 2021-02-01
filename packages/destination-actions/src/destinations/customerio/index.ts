import { DestinationDefinition } from '../../lib/destination-kit'
import addPersonToSegment from './addPersonToSegment'
import createUpdateDevice from './createUpdateDevice'
import createUpdatePerson from './createUpdatePerson'
import removePersonFromSegment from './removePersonFromSegment'
import trackAnonymousEvent from './trackAnonymousEvent'
import trackEvent from './trackEvent'
import triggerCampaign from './triggerCampaign'
import type { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: 'Customer.io',
  authentication: {
    type: 'custom',
    testAuthentication: (req, { settings }) => {
      return req('https://beta-api.customer.io/v1/api/segments', {
        prefixUrl: '',
        headers: {
          authorization: `Bearer ${settings.appApiKey}`
        }
      })
    }
  },
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    properties: {
      siteId: {
        description:
          'Customer.io site ID. This can be found on your [API Credentials page](https://fly.customer.io/settings/api_credentials).',
        minLength: 20,
        title: 'Site ID',
        type: 'string'
      },
      apiKey: {
        description:
          'Customer.io API key. This can be found on your [API Credentials page](https://fly.customer.io/settings/api_credentials).',
        minLength: 20,
        title: 'API Key',
        type: 'string'
      },
      appApiKey: {
        description:
          'Customer.io App API Key. This can be found on your [API Credentials page](https://fly.customer.io/settings/api_credentials?keyType=app).',
        minLength: 20,
        title: 'App API Key (optional)',
        type: 'string'
      }
    },
    additionalProperties: false,
    required: ['siteId', 'apiKey']
  },
  extendRequest({ settings }) {
    const userPass = Buffer.from(`${settings.siteId}:${settings.apiKey}`)

    return {
      prefixUrl: 'https://track.customer.io/api/v1',
      headers: {
        Authorization: `Basic ${userPass.toString('base64')}`
      },
      responseType: 'json'
    }
  },

  actions: {
    addPersonToSegment,
    createUpdateDevice,
    createUpdatePerson,
    removePersonFromSegment,
    trackAnonymousEvent,
    trackEvent,
    triggerCampaign
  }
}

export default destination

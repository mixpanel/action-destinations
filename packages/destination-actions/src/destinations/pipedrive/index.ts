import { DestinationDefinition } from '../../lib/destination-kit'
import createUpdateOrganization from './createUpdateOrganization'
import createUpdatePerson from './createUpdatePerson'
import type { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: 'Pipedrive',
  authentication: {
    scheme: 'custom',
    fields: {
      domain: {
        title: 'Domain',
        description: 'Pipedrive domain. This is found in Pipedrive in Settings > Company settings > Company domain.',
        type: 'string',
        required: true,
        minLength: 1
      },
      apiToken: {
        title: 'API Token',
        description:
          'Pipedrive API token. This is found in Pipedrive in Settings > Personal preferences > API > Your personal API token.',
        type: 'string',
        required: true,
        minLength: 20
      }
    },
    testAuthentication: (req) => req('users/me')
  },

  extendRequest({ settings }) {
    return {
      prefixUrl: `https://${settings.domain}.pipedrive.com/api/v1/`,
      searchParams: {
        api_token: settings.apiToken
      },
      responseType: 'json'
    }
  },

  actions: {
    createUpdateOrganization,
    createUpdatePerson
  }
}

export default destination

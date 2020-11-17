import { DestinationDefinition } from '../../lib/destination-kit'
import createUpdateOrganization from './createUpdateOrganization'
import createUpdatePerson from './createUpdatePerson'
import deletePerson from './deletePerson'
import { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: 'Pipedrive',
  authentication: {
    type: 'custom',
    testAuthentication: (req) => req('users/me')
  },
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    properties: {
      domain: {
        title: 'Domain',
        description: 'Pipedrive domain. This is found in Pipedrive in Settings > Company settings > Company domain.',
        type: 'string',
        minLength: 1
      },
      apiToken: {
        title: 'API Token',
        description:
          'Pipedrive API token. This is found in Pipedrive in Settings > Personal preferences > API > Your personal API token.',
        type: 'string',
        minLength: 20
      }
    },
    additionalProperties: false,
    required: ['domain', 'apiToken']
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
    createUpdatePerson,
    deletePerson
  }
}

export default destination

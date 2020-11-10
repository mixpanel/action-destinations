import { JSONSchema7 } from 'json-schema'
import { DestinationDefinition } from '../../lib/destination-kit'
import settings from './settings.schema.json'
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
  schema: settings as JSONSchema7,
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

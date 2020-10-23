import { JSONSchema7 } from 'json-schema'
import { Destination } from '../../lib/destination-kit'

import settings from './settings.schema.json'
import createUpdateOrganization from './createUpdateOrganization'
import createUpdatePerson from './createUpdatePerson'
import deletePerson from './deletePerson'
import { Settings } from './generated-types'

export default function createDestination(): Destination<Settings> {
  const destination = new Destination<Settings>({
    name: 'Pipedrive',
    // TODO get this from the database
    authentication: {
      type: 'API Key',
      testAuthentication: (req) => req('users/me')
    },
    // TODO get this from the database
    schema: settings as JSONSchema7,
    extendRequest({ settings }) {
      return {
        prefixUrl: `https://${settings.domain}.pipedrive.com/api/v1/`,
        searchParams: {
          api_token: settings.apiToken
        },
        responseType: 'json'
      }
    }
  })

  destination.partnerAction('createUpdateOrganization', createUpdateOrganization)
  destination.partnerAction('createUpdatePerson', createUpdatePerson)
  destination.partnerAction('deletePerson', deletePerson)

  return destination
}

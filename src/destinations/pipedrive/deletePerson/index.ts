import { get } from 'lodash'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Delete Person',
  description: 'Delete a person in Pipedrive.',
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    defaultSubscription: 'type = "delete"',
    properties: {
      identifier: {
        title: 'Person ID',
        description:
          'Identifier used to find person to delete in Pipedrive. Can be an email, name, phone number, or custom field value. Custom person fields may be included by using the long hash keys of the custom fields. These look like "33595c732cd7a027c458ea115a48a7f8a254fa86".',
        type: 'string',
        defaultMapping: {
          '@template': '{{userId}}'
        }
      }
    },
    required: ['identifier']
  },

  cachedFields: {
    personId: {
      ttl: 60,
      key: ({ payload }) => payload.identifier,
      value: async (req, { payload }) => {
        const search = await req.get('persons/search', {
          searchParams: {
            term: payload.identifier
          }
        })

        return get(search.body, 'data.items[0].item.id')
      }
    }
  },

  perform: (req, { cachedFields }) => {
    const personId = cachedFields.personId

    if (personId === undefined || personId === null) {
      return null
    }
    return req.delete(`persons/${personId}`)
  }
}

export default action

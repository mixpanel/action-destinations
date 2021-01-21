import { get } from 'lodash'
import dayjs from '../../../lib/dayjs'
import { ActionDefinition } from '../../../lib/destination-kit/action'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Create or Update Organization',
  description: "Update an organization in Pipedrive or create it if it doesn't exist yet.",
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    defaultSubscription: 'type = "group"',
    properties: {
      identifier: {
        title: 'Organization ID',
        description:
          'Identifier used to find existing organization in Pipedrive. Typically this is the name but it can also be a custom field value. Custom organization fields may be included by using the long hash keys of the custom fields. These look like "33595c732cd7a027c458ea115a48a7f8a254fa86".',
        type: 'string'
      },
      name: {
        title: 'Organization Name',
        type: 'string'
      },
      owner_id: {
        title: 'Owner ID',
        description:
          'ID of the user who will be marked as the owner of this organization. Default is the user who ownes the API token.',
        type: 'number'
      },
      add_time: {
        title: 'Created At',
        description:
          'If the organization is created, use this timestamp as the creation timestamp. Format: YYY-MM-DD HH:MM:SS',
        type: 'string'
      }
    },
    required: ['identifier', 'name']
  },

  cachedFields: {
    organizationId: {
      ttl: 60,
      key: ({ payload }) => payload.identifier,
      value: async (req, { payload }) => {
        const search = await req.get('organizations/search', {
          searchParams: { term: payload.identifier }
        })
        return get(search.body, 'data.items[0].item.id')
      }
    }
  },

  perform: (req, { payload, cachedFields }) => {
    const organizationId = cachedFields.organizationId

    const organization = {
      name: payload.name,
      owner_id: payload.owner_id
    }

    if (organizationId === undefined || organizationId === null) {
      return req.post('organizations', {
        json: {
          ...organization,
          add_time: payload.add_time ? dayjs.utc(payload.add_time).format('YYYY-MM-DD HH:MM:SS') : undefined
        }
      })
    }

    return req.put(`organizations/${organizationId}`, {
      json: organization
    })
  }
}

export default action

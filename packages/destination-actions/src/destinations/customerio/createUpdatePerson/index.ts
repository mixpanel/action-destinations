import dayjs from '../../../lib/dayjs'
import { ActionDefinition } from '../../../lib/destination-kit/action'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Create or Update Person',
  description: "Update a person in Customer.io or create them if they don't exist.",
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    defaultSubscription: 'type = "identify"',
    properties: {
      id: {
        title: 'Person ID',
        description: 'ID used to uniquely identify person in Customer.io.',
        type: 'string',
        defaultMapping: {
          '@template': '{{userId}}'
        }
      },
      email: {
        title: 'Email Address',
        description: "Person's email address.",
        type: 'string',
        defaultMapping: {
          '@template': '{{traits.userId}}'
        }
      },
      created_at: {
        title: 'Created At',
        description: 'Timestamp for when the person was created. Default is current date and time.',
        type: 'string',
        defaultMapping: {
          '@template': '{{timestamp}}'
        }
      },
      custom_attributes: {
        title: 'Custom Attributes',
        description:
          'Optional custom attributes for this person. When updating a person, attributes are added and not removed.',
        type: 'object',
        defaultMapping: {
          '@path': '$.traits'
        }
      }
    },
    required: ['id', 'email']
  },

  perform: (req, { payload }) => {
    return req.put(`customers/${payload.id}`, {
      json: {
        ...payload.custom_attributes,
        email: payload.email,
        created_at: payload.created_at ? dayjs.utc(payload.created_at).format('X') : undefined
      }
    })
  }
}

export default action

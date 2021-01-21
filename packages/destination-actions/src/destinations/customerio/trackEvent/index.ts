import { ActionDefinition } from '../../../lib/destination-kit/action'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Track Event',
  description: 'Track an event for a known person.',
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    defaultSubscription: 'type = "track"',
    properties: {
      id: {
        title: 'Person ID',
        description: 'ID of the person who triggered this event.',
        type: 'string',
        defaultMapping: {
          '@template': '{{userId}}'
        }
      },
      name: {
        title: 'Event Name',
        type: 'string',
        defaultMapping: {
          '@template': '{{event}}'
        }
      },
      type: {
        title: 'Event Type',
        description: 'Override event type. Ex. "page".',
        type: 'string',
        defaultMapping: {
          '@template': '{{type}}'
        }
      },
      data: {
        title: 'Data',
        description: 'Custom data to include with the event.',
        type: 'object',
        defaultMapping: {
          '@path': '$.properties'
        }
      }
    },
    required: ['id', 'name']
  },

  perform: (request, { payload }) => {
    return request.post(`customers/${payload.id}/events`, {
      json: {
        name: payload.name,
        type: payload.type,
        data: payload.data
      }
    })
  }
}

export default action

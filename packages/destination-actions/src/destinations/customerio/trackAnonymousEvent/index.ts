import { ActionDefinition } from '../../../lib/destination-kit/action'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Track Anonymous Event',
  description: 'Track an event not tied to a known person.',
  recommended: false,
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    defaultSubscription: 'type = "track"',
    properties: {
      name: {
        title: 'Event Name',
        type: 'string',
        default: {
          '@template': '{{event}}'
        }
      },
      data: {
        title: 'Data',
        description:
          'Custom data to include with the event. If "recipient", "from_address", or "reply_to" are sent, they will override settings on any campaigns triggered by this event. "recipient" is required if the event is used to trigger a campaign.',
        type: 'object',
        default: {
          '@path': '$.properties'
        }
      }
    },
    required: ['name']
  },

  perform: (request, { payload }) => {
    return request.post('events', {
      json: payload
    })
  }
}

export default action

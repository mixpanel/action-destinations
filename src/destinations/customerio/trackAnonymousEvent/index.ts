import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { TrackAnonymousEvent } from './generated-types'

const action: ActionDefinition<Settings, TrackAnonymousEvent> = {
  schema: {
    $schema: 'http://json-schema.org/schema#',
    title: 'Track Anonymous Event',
    description: 'Track an event not tied to a known person.',
    type: 'object',
    additionalProperties: false,
    defaultSubscription: 'type = "track"',
    properties: {
      name: {
        title: 'Event Name',
        type: 'string',
        defaultMapping: {
          '@template': '{{event}}'
        }
      },
      data: {
        title: 'Data',
        description:
          'Custom data to include with the event. If "recipient", "from_address", or "reply_to" are sent, they will override settings on any campaigns triggered by this event. "recipient" is required if the event is used to trigger a campaign.',
        type: 'object',
        defaultMapping: {
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

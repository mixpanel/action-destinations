import { ActionDefinition } from '../../../lib/destination-kit/action'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Track Event',
  description: 'Track an event for a known person.',
  recommended: true,
  defaultSubscription: 'type = "track"',
  fields: {
    id: {
      title: 'Person ID',
      description: 'ID of the person who triggered this event.',
      type: 'string',
      required: true,
      default: {
        '@path': '$.userId'
      }
    },
    name: {
      title: 'Event Name',
      type: 'string',
      required: true,
      default: {
        '@path': '$.event'
      }
    },
    type: {
      title: 'Event Type',
      description: 'Override event type. Ex. "page".',
      type: 'string',
      default: {
        '@path': '$.type'
      }
    },
    data: {
      title: 'Data',
      description: 'Custom data to include with the event.',
      type: 'object',
      default: {
        '@path': '$.properties'
      }
    }
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

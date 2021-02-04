import dayjs from '../../../lib/dayjs'
import { ActionDefinition } from '../../../lib/destination-kit/action'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Create or Update Device',
  description: "Update a person's device in Customer.io or create it if it doesn't exist.",
  recommended: true,
  defaultSubscription: 'event = "Application Installed"',
  fields: {
    person_id: {
      title: 'Person ID',
      description: 'ID of the person that this device belongs to.',
      type: 'string',
      required: true,
      default: {
        '@template': '{{userId}}'
      }
    },
    device_id: {
      title: 'Device ID',
      description: 'Unique ID for this device.',
      type: 'string',
      required: true,
      default: {
        '@template': '{{context.device.id}}'
      }
    },
    platform: {
      title: 'Platform',
      description: 'The device platform.',
      type: 'string',
      required: true,
      enum: ['ios', 'android'],
      default: {
        '@template': '{{context.device.type}}'
      }
    },
    last_used: {
      title: 'Last Used',
      description: 'Timestamp for when the device was last used. Default is current date and time.',
      type: 'string',
      default: {
        '@template': '{{timestamp}}'
      }
    }
  },

  perform: (req, { payload }) => {
    return req.put(`customers/${payload.person_id}/devices`, {
      json: {
        device: {
          id: payload.device_id,
          platform: payload.platform,
          last_used: payload.last_used ? dayjs.utc(payload.last_used).format('X') : undefined
        }
      }
    })
  }
}

export default action

import dayjs from '@/lib/dayjs'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Create or Update Device',
  description: "Update a person's device in Customer.io or create it if it doesn't exist.",
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    defaultSubscription: 'event = "Application Installed"',
    properties: {
      person_id: {
        title: 'Person ID',
        description: 'ID of the person that this device belongs to.',
        type: 'string',
        defaultMapping: {
          '@template': '{{userId}}'
        }
      },
      device_id: {
        title: 'Device ID',
        description: 'Unique ID for this device.',
        type: 'string',
        defaultMapping: {
          '@template': '{{context.device.id}}'
        }
      },
      platform: {
        title: 'Platform',
        description: 'The device platform.',
        type: 'string',
        enum: ['ios', 'android'],
        defaultMapping: {
          '@template': '{{context.device.type}}'
        }
      },
      last_used: {
        title: 'Last Used',
        description: 'Timestamp for when the device was last used. Default is current date and time.',
        type: 'string',
        defaultMapping: {
          '@template': '{{timestamp}}'
        }
      }
    },
    required: ['person_id', 'device_id', 'platform']
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

import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { CreateOrUpdateDevice } from './generated-types'

export default function(action: Action<Settings, CreateOrUpdateDevice>): Action<Settings, CreateOrUpdateDevice> {
  return action
    .validatePayload(payloadSchema)

    .mapField('$.last_used', {
      '@timestamp': {
        timestamp: { '@path': '$.last_used' },
        format: 'X'
      }
    })

    .request(async (req, { payload }) => {
      return req.put(`customers/${payload.person_id}/devices`, {
        json: {
          device: {
            id: payload.device_id,
            platform: payload.platform,
            last_used: payload.last_used
          }
        }
      })
    })
}

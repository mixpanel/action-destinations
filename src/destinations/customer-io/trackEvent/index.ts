import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { TrackEvent } from './generated-types'

export default function(action: Action<Settings, TrackEvent>): Action<Settings, TrackEvent> {
  return action
    .validatePayload(payloadSchema)

    .request(async (req, { payload }) => {
      return req.post(`customers/${payload.id}/events`, {
        json: {
          name: payload.name,
          type: payload.type,
          data: payload.data
        }
      })
    })
}

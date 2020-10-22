import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { TrackAnonymousEvent } from './generated-types'

export default function(action: Action<Settings, TrackAnonymousEvent>): Action<Settings, TrackAnonymousEvent> {
  return action
    .validatePayload(payloadSchema)

    .request(async (req, { payload }) => {
      return req.post('events', {
        json: payload
      })
    })
}

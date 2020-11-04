import dayjs from '@/lib/dayjs'
import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { TrackUser } from './generated-types'

export default function(action: Action<Settings, TrackUser>): Action<Settings, TrackUser> {
  return action.validatePayload(payloadSchema).request((req, { payload, settings }) => {
    const event = { ...payload }

    if (payload.time) {
      event.time = dayjs.utc(payload.time).format('x')
    }

    if (payload.session_id) {
      event.session_id = dayjs.utc(payload.session_id).format('x')
    }

    return req.post('https://api2.amplitude.com/2/httpapi', {
      json: {
        api_key: settings.apiKey,
        events: [event]
      }
    })
  })
}

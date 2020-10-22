import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { TrackUser } from './generated-types'

export default function(action: Action<Settings, TrackUser>): Action<Settings, TrackUser> {
  return action
    .validatePayload(payloadSchema)

    .mapField('$.time', {
      '@timestamp': {
        timestamp: { '@path': '$.time' },
        format: 'x'
      }
    })

    .mapField('$.session_id', {
      '@timestamp': {
        timestamp: { '@path': '$.session_id' },
        format: 'x'
      }
    })

    .request((req, { payload, settings }) => {
      return req.post('https://api2.amplitude.com/2/httpapi', {
        json: {
          api_key: settings.apiKey,
          events: [payload]
        }
      })
    })
}

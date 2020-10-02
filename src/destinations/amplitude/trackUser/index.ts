import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
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

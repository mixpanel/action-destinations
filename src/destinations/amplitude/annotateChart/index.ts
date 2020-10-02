import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
  return action
    .validatePayload(payloadSchema)

    .mapField('$.date', {
      '@timestamp': {
        timestamp: { '@path': '$.date' },
        format: 'x'
      }
    })

    .request((req, { payload, settings }) => {
      return req.post('https://amplitude.com/api/2/annotations', {
        username: settings.apiKey,
        password: settings.secretKey,
        form: payload
      })
    })
}

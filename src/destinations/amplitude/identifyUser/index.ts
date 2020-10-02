import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
  return action
    .validatePayload(payloadSchema)

    .request((req, { payload, settings }) => {
      return req.post('https://api.amplitude.com/identify', {
        form: {
          api_key: settings.apiKey,
          identification: JSON.stringify(payload)
        }
      })
    })
}

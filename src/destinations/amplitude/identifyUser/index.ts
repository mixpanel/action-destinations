import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { IdentifyUser } from './generated-types'

export default function(action: Action<Settings, IdentifyUser>): Action<Settings, IdentifyUser> {
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

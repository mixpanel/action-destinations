import { Action } from '@/lib/destination-kit/action'
import settingSchema from './settings.schema.json'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
  return action
    .validateSettings(settingSchema)

    .validatePayload(payloadSchema)

    .request((req, { payload, settings }) => {
      return req.post(settings.url, {
        json: payload
      })
    })
}

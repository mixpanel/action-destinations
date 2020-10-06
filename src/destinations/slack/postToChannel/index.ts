import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
  return action.validatePayload(payloadSchema).request((req, { payload }) => {
    const { url, ...fields } = payload

    return req.post(url, {
      json: fields,
      responseType: 'text'
    })
  })
}

import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { PostMessage } from './generated-types'

export default function(action: Action<{}, PostMessage>): Action<{}, PostMessage> {
  return action.validatePayload(payloadSchema).request((req, { payload }) => {
    const { url, ...fields } = payload

    return req.post(url, {
      json: fields,
      responseType: 'text'
    })
  })
}

import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { PostMessage } from './generated-types'

export default function(action: Action<{}, PostMessage>): Action<{}, PostMessage> {
  return action.validatePayload(payloadSchema).request((req, { payload }) => {
    return req.post(payload.url, {
      json: {
        channel: payload.channel,
        text: payload.text,
        username: payload.username,
        icon_url: payload.icon_url
      },
      responseType: 'text'
    })
  })
}

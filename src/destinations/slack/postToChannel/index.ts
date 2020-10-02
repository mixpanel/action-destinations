import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
  return action
    .validatePayload(payloadSchema)

    .fanOut({
      on: 'payload.channels',
      as: 'channel'
    })

    .request((req, { payload, channel }) => {
      return req.post(payload.url, {
        json: {
          channel,
          text: payload.text,
          username: payload.username,
          icon_url: payload.icon_url
        },
        responseType: 'text'
      })
    })

    .fanIn()
}

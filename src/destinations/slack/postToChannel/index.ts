import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { PostMessage } from './generated-types'
import schema from './payload.schema.json'

const action: ActionDefinition<Settings, PostMessage> = {
  schema,
  perform: (request, { payload }) => {
    return request.post(payload.url, {
      json: {
        channel: payload.channel,
        text: payload.text,
        username: payload.username,
        icon_url: payload.icon_url
      },
      responseType: 'text'
    })
  }
}

export default action

import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { IdentifyUser } from './generated-types'
import schema from './payload.schema.json'

const action: ActionDefinition<Settings, IdentifyUser> = {
  schema,
  perform: (request, { payload, settings }) => {
    return request.post('https://api.amplitude.com/identify', {
      form: {
        api_key: settings.apiKey,
        identification: JSON.stringify(payload)
      }
    })
  }
}

export default action

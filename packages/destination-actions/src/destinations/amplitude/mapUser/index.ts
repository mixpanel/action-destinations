import { ActionDefinition } from '../../../lib/destination-kit/action'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Map User',
  description: 'Merge two users together that would otherwise have different User IDs tracked in Amplitude.',
  recommended: false,
  defaultSubscription: 'type = "alias"',
  fields: {
    user_id: {
      title: 'User ID',
      type: 'string',
      description: 'The User ID to be associated',
      default: {
        '@path': '$.previousId'
      }
    },
    global_user_id: {
      title: 'Global User ID',
      type: 'string',
      description: 'The global User ID to associate to',
      default: {
        '@path': '$.userId'
      }
    }
  },
  perform: (request, { payload, settings }) => {
    return request.post('https://api.amplitude.com/usermap', {
      form: {
        api_key: settings.apiKey,
        mapping: JSON.stringify([payload])
      }
    })
  }
}

export default action

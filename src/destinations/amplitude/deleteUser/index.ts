import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { DeleteUser } from './generated-types'

interface DeleteUserBody {
  amplitude_ids?: string[]
  delete_from_org?: 'True' | 'False'
  ignore_invalid_id?: 'True' | 'False'
  requester?: string
  user_ids?: string[]
}

const definition: ActionDefinition<Settings, DeleteUser> = {
  schema: {
    $schema: 'http://json-schema.org/schema#',
    title: 'Delete User',
    description: 'Delete a user from Amplitude.',
    type: 'object',
    additionalProperties: false,
    defaultSubscription: 'type = "delete"',
    properties: {
      amplitude_id: {
        title: 'Amplitude ID',
        type: 'string'
      },
      user_id: {
        title: 'User ID',
        type: 'string',
        defaultMapping: {
          '@template': '{{userId}}'
        }
      },
      requester: {
        title: 'Requester',
        type: 'string'
      },
      ignore_invalid_id: {
        title: 'Ignore Invalid ID',
        description: "Ignore invalid user ID (user that doesn't exist in the project) that was passed in.",
        type: 'boolean'
      },
      delete_from_org: {
        title: 'Delete From Organization',
        description: 'Delete from the entire organization rather than just this project.',
        type: 'boolean'
      }
    }
  },
  perform: (req, { payload, settings }) => {
    const body: DeleteUserBody = {
      requester: payload.requester
    }

    if (typeof payload.ignore_invalid_id === 'boolean') {
      body.ignore_invalid_id = payload.ignore_invalid_id ? 'True' : 'False'
    }

    if (typeof payload.delete_from_org === 'boolean') {
      body.delete_from_org = payload.delete_from_org ? 'True' : 'False'
    }

    if (payload.amplitude_id !== undefined) {
      body.amplitude_ids = [payload.amplitude_id]
    }

    if (payload.user_id !== undefined) {
      body.user_ids = [payload.user_id]
    }

    return req.post('https://amplitude.com/api/2/deletions/users', {
      username: settings.apiKey,
      password: settings.secretKey,
      json: body
    })
  }
}

export default definition

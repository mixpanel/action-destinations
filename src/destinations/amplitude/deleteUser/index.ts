import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { DeleteUser } from './generated-types'
import schema from './payload.schema.json'

interface DeleteUserBody {
  amplitude_ids?: string[]
  delete_from_org?: 'True' | 'False'
  ignore_invalid_id?: 'True' | 'False'
  requester?: string
  user_ids?: string[]
}

const definition: ActionDefinition<Settings, DeleteUser> = {
  schema,
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

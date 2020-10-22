import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { DeleteUser } from './generated-types'

interface DeleteUserBody extends Omit<DeleteUser, 'user_id' | 'amplitude_id'> {
  amplitude_ids?: string[]
  user_ids?: string[]
}

export default function(action: Action<Settings, DeleteUser>): Action<Settings, DeleteUser> {
  return action
    .validatePayload(payloadSchema)

    .mapField('$.ignore_invalid_id', {
      '@if': {
        true: { '@path': '$.ignore_invalid_id' },
        then: 'True',
        else: 'False'
      }
    })

    .mapField('$.delete_from_org', {
      '@if': {
        true: { '@path': '$.delete_from_org' },
        then: 'True',
        else: 'False'
      }
    })

    .request((req, { payload, settings }) => {
      const body: DeleteUserBody = {
        ignore_invalid_id: payload.ignore_invalid_id,
        delete_from_org: payload.delete_from_org,
        requester: payload.requester
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
    })
}

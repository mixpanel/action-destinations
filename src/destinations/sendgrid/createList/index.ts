import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { CreateContactList } from './generated-types'

export default function(action: Action<Settings, CreateContactList>): Action<Settings, CreateContactList> {
  return action
    .validatePayload(payloadSchema)
    .request(async (req, { payload }) => req.post('marketing/lists', { json: payload }))
}

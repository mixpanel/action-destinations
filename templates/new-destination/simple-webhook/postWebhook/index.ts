import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
  return action.validatePayload(payloadSchema).request((req, { payload }) => req.post('', { json: payload }))
}

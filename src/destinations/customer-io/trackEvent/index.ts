import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
  return action
    .validatePayload(payloadSchema)

    .request(async (req, { payload }) => {
      const { id, ...body } = payload

      return req.post(`customers/${id}/events`, {
        json: body
      })
    })
}

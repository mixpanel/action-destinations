import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { CreateRecord } from './generated-types'

export default function(action: Action<Settings, CreateRecord>): Action<Settings, CreateRecord> {
  return action.validatePayload(payloadSchema).request((req, { payload }) => {
    return req.post(payload.url, {
      json: {
        records: [
          {
            fields: payload.fields
          }
        ]
      }
    })
  })
}

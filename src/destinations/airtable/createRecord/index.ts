import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { CreateRecord } from './generated-types'
import schema from './payload.schema.json'

const action: ActionDefinition<Settings, CreateRecord> = {
  schema,
  perform: (request, { payload }) => {
    return request.post(payload.url, {
      json: {
        records: [
          {
            fields: payload.fields
          }
        ]
      }
    })
  }
}

export default action

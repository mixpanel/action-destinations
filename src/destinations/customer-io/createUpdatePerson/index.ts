import dayjs from '@/lib/dayjs'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { CreateOrUpdatePerson } from './generated-types'
import schema from './payload.schema.json'

const definition: ActionDefinition<Settings, CreateOrUpdatePerson> = {
  schema,
  perform: (req, { payload }) => {
    return req.put(`customers/${payload.id}`, {
      json: {
        ...payload.custom_attributes,
        email: payload.email,
        created_at: payload.created_at ? dayjs.utc(payload.created_at).format('X') : undefined
      }
    })
  }
}

export default definition

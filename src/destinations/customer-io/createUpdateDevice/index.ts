import dayjs from '@/lib/dayjs'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { CreateOrUpdateDevice } from './generated-types'
import schema from './payload.schema.json'

const definition: ActionDefinition<Settings, CreateOrUpdateDevice> = {
  schema,
  perform: (req, { payload }) => {
    return req.put(`customers/${payload.person_id}/devices`, {
      json: {
        device: {
          id: payload.device_id,
          platform: payload.platform,
          last_used: payload.last_used ? dayjs.utc(payload.last_used).format('X') : undefined
        }
      }
    })
  }
}

export default definition

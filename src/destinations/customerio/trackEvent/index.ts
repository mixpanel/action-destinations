import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { TrackEvent } from './generated-types'
import schema from './payload.schema.json'

const action: ActionDefinition<Settings, TrackEvent> = {
  schema,
  perform: (request, { payload }) => {
    return request.post(`customers/${payload.id}/events`, {
      json: {
        name: payload.name,
        type: payload.type,
        data: payload.data
      }
    })
  }
}

export default action

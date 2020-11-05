import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { TrackAnonymousEvent } from './generated-types'
import schema from './payload.schema.json'

const action: ActionDefinition<Settings, TrackAnonymousEvent> = {
  schema,
  perform: (request, { payload }) => {
    return request.post('events', {
      json: payload
    })
  }
}

export default action

import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { CreateContactList } from './generated-types'
import schema from './payload.schema.json'

const action: ActionDefinition<Settings, CreateContactList> = {
  schema,
  perform: (request, { payload }) => {
    return request.post('marketing/lists', {
      json: payload
    })
  }
}

export default action

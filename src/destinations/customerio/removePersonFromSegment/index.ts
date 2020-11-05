import segmentIdAutocomplete from '../autocomplete/segment_id'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { RemovePersonFromSegment } from './generated-types'
import schema from './payload.schema.json'

const definition: ActionDefinition<Settings, RemovePersonFromSegment> = {
  schema,

  autocompleteFields: {
    segment_id: segmentIdAutocomplete
  },

  perform: (req, { payload }) => {
    return req.post(`segments/${payload.segment_id}/remove_customers`, {
      json: {
        ids: [payload.person_id]
      }
    })
  }
}

export default definition

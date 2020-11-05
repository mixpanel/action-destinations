import segmentIdAutocomplete from '../autocomplete/segment_id'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { AddPersonToSegment } from './generated-types'
import schema from './payload.schema.json'

const definition: ActionDefinition<Settings, AddPersonToSegment> = {
  schema,

  autocompleteFields: {
    segment_id: segmentIdAutocomplete
  },

  perform: (req, { payload }) => {
    const { segment_id: segmentId, person_id: personId } = payload

    return req.post(`segments/${segmentId}/add_customers`, {
      json: {
        ids: [personId]
      }
    })
  }
}

export default definition

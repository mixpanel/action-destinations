import segmentIdAutocomplete from '../autocomplete/segment_id'
import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { AddPersonToSegment } from './generated-types'

export default function(action: Action<Settings, AddPersonToSegment>): Action<Settings, AddPersonToSegment> {
  return action
    .validatePayload(payloadSchema)

    .autocomplete('segment_id', segmentIdAutocomplete)

    .request(async (req, { payload }) => {
      const { segment_id: segmentId, person_id: personId } = payload

      return req.post(`segments/${segmentId}/add_customers`, {
        json: {
          ids: [personId]
        }
      })
    })
}

import segmentIdAutocomplete from '../autocomplete/segment_id'
import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { RemovePersonFromSegment } from './generated-types'

export default function(action: Action<Settings, RemovePersonFromSegment>): Action<Settings, RemovePersonFromSegment> {
  return action
    .validatePayload(payloadSchema)

    .autocomplete('segment_id', segmentIdAutocomplete)

    .request(async (req, { payload }) => {
      const { segment_id: segmentId, person_id: customerId } = payload

      return req.post(`segments/${segmentId}/remove_customers`, {
        json: {
          ids: [customerId]
        }
      })
    })
}

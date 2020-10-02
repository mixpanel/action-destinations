import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import listIdAutocomplete from '../autocomplete/list_id'

export default function(action: Action): Action {
  return action
    .validatePayload(payloadSchema)

    .autocomplete('list_id', listIdAutocomplete)

    .request((req, { payload }) => {
      const { list_id: listId, ...contact } = payload

      return req.put('marketing/contacts', {
        json: {
          list_ids: [listId],
          contacts: [contact]
        }
      })
    })
}

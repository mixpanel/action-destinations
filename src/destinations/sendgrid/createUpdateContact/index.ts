import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import listIdAutocomplete from '../autocomplete/list_id'
import { Settings } from '../generated-types'
import { CreateOrUpdateContact } from './generated-types'

export default function(action: Action<Settings, CreateOrUpdateContact>): Action<Settings, CreateOrUpdateContact> {
  return action
    .validatePayload(payloadSchema)

    .autocomplete('list_id', listIdAutocomplete)

    .request((req, { payload }) => {
      return req.put('marketing/contacts', {
        json: {
          list_ids: [payload.list_id],
          contacts: [
            {
              email: payload.email,
              alternate_emails: payload.alternate_emails,
              address_line_1: payload.address_line_1,
              address_line_2: payload.address_line_2,
              city: payload.city,
              country: payload.country,
              first_name: payload.first_name,
              last_name: payload.last_name,
              postal_code: payload.postal_code,
              state_province_region: payload.state_province_region,
              custom_fields: payload.custom_fields
            }
          ]
        }
      })
    })
}

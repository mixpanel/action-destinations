import { ActionDefinition } from '@/lib/destination-kit/action'
import listIdAutocomplete from '../autocomplete/list_id'
import { Settings } from '../generated-types'
import { CreateOrUpdateContact } from './generated-types'
import schema from './payload.schema.json'

const definition: ActionDefinition<Settings, CreateOrUpdateContact> = {
  schema,

  autocompleteFields: {
    list_id: listIdAutocomplete
  },

  perform: (req, { payload }) => {
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
  }
}

export default definition

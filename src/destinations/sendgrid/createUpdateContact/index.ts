import { ActionDefinition } from '@/lib/destination-kit/action'
import listIdAutocomplete from '../autocomplete/list_id'
import { Settings } from '../generated-types'
import { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Create or Update Contact',
  description: "Update an existing marketing contact or create them if they don't exist.",
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    defaultSubscription: 'type = "identify"',
    properties: {
      list_id: {
        title: 'List ID',
        description: 'ID of the marketing contact list you want the contact added to.',
        type: 'string',
        autocomplete: true
      },
      email: {
        title: 'Email Address',
        type: 'string',
        description: 'The primary email for the contact.',
        maxLength: 254,
        defaultMapping: {
          '@template': '{{properties.email}}'
        }
      },
      alternate_emails: {
        title: 'Additional Amail Addresses',
        type: 'array',
        description: 'Additional emails associated with the contact.',
        items: {
          type: 'string'
        },
        maxItems: 5
      },
      address_line_1: {
        title: 'Address Line (1)',
        type: 'string',
        description: 'The first line of the address.',
        maxLength: 100
      },
      address_line_2: {
        title: 'Address Line (2)',
        type: 'string',
        description: 'Optional second line for the address.',
        maxLength: 100
      },
      city: {
        title: 'City',
        type: 'string',
        description: 'The city of the contact.',
        maxLength: 60,
        defaultMapping: {
          '@template': '{{context.location.city}}'
        }
      },
      country: {
        title: 'Country',
        type: 'string',
        description: 'The country of the contacts address. Accepts full name or abbreviation.',
        maxLength: 50,
        defaultMapping: {
          '@template': '{{context.location.country}}'
        }
      },
      first_name: {
        title: 'First Name',
        type: 'string',
        description: 'The contacts personal name.',
        maxLength: 50
      },
      last_name: {
        title: 'Last Name',
        type: 'string',
        description: 'The contacts family name.',
        maxLength: 50
      },
      postal_code: {
        title: 'Postal Code',
        type: 'string',
        description: 'The postcode, post code, Eircode, PIN code or ZIP code.'
      },
      state_province_region: {
        title: 'Region',
        type: 'string',
        description: 'The state, province, or region of the contacts address.',
        maxLength: 50
      },
      custom_fields: {
        title: 'Custom Fields',
        type: 'object',
        description: 'Object with custom data to associate with this contact.'
      }
    },
    required: ['list_id', 'email']
  },

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

export default action

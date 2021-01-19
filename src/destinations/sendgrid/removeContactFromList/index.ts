import { get } from 'lodash'
import listIdAutocomplete from '../autocomplete/list_id'
import { ActionDefinition } from '@/lib/destination-kit/action'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

// SendGrid uses a custom "SGQL" query language for finding contacts. To protect us from basic
// injection attacks (e.g. "email = 'x@x.com' or email like '%@%'"), we can just strip all quotes
// from untrusted values.
const sgqlEscape = (s: string): string => {
  return s.replace(/['"]/g, '')
}

const action: ActionDefinition<Settings, Payload> = {
  title: 'Remove Recipient from List',
  description: 'Remove a recipient from a list.',
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    properties: {
      list_id: {
        title: 'List ID',
        description: 'The ID of the SendGrid list to remove the user from.',
        type: 'string',
        autocomplete: true
      },
      email: {
        title: 'Email Address',
        description: 'Email address of the user to be removed from the list.',
        type: 'string',
        defaultMapping: {
          '@template': '{{properties.email}}'
        }
      }
    },
    required: ['list_id', 'email']
  },

  autocompleteFields: {
    list_id: listIdAutocomplete
  },

  cachedFields: {
    contactId: {
      ttl: 60,
      key: ({ payload }) => `${payload.email}-${payload.list_id}`,
      value: async (req, { payload }) => {
        const search = await req.post('marketing/contacts/search', {
          json: {
            query: `email = '${sgqlEscape(payload.email)}' AND CONTAINS(list_ids, '${sgqlEscape(payload.list_id)}')`
          }
        })
        return get(search.body, 'result[0].id')
      }
    }
  },

  perform: (req, { payload, cachedFields }) => {
    const contactId = cachedFields.contactId

    if (contactId === null || contactId === undefined) {
      return null
    }

    return req.delete(`marketing/lists/${payload.list_id}/contacts?contact_ids=${contactId}`)
  }
}

export default action

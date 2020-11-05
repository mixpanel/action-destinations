import { get } from 'lodash'
import listIdAutocomplete from '../autocomplete/list_id'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { RemoveRecipientFromList } from './generated-types'
import schema from './payload.schema.json'

// SendGrid uses a custom "SGQL" query language for finding contacts. To protect us from basic
// injection attacks (e.g. "email = 'x@x.com' or email like '%@%'"), we can just strip all quotes
// from untrusted values.
const sgqlEscape = (s: string): string => {
  return s.replace(/['"]/g, '')
}

const definition: ActionDefinition<Settings, RemoveRecipientFromList> = {
  schema,

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

  perform: (req, { payload, cacheIds }) => {
    const contactId = cacheIds.contactId

    if (contactId === null || contactId === undefined) {
      return null
    }

    return req.delete(`marketing/lists/${payload.list_id}/contacts?contact_ids=${contactId}`)
  }
}

export default definition

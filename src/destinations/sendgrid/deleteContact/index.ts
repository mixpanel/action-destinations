import { get } from 'lodash'
import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { DeleteContact } from './generated-types'

// SendGrid uses a custom "SGQL" query language for finding contacts. To protect us from basic
// injection attacks (e.g. "email = 'x@x.com' or email like '%@%'"), we can just strip all quotes
// from untrusted values.
const sgqlEscape = (s: string): string => {
  return s.replace(/['"]/g, '')
}
export default function(action: Action<Settings, DeleteContact>): Action<Settings, DeleteContact> {
  return action
    .validatePayload(payloadSchema)

    .cachedRequest({
      ttl: 60,
      key: ({ payload }) => payload.email,
      value: async (req, { payload }) => {
        const search = await req.post('marketing/contacts/search', {
          json: {
            query: `email = '${sgqlEscape(payload.email)}'`
          }
        })
        return get(search.body, 'result[0].id')
      },
      as: 'contactId'
    })

    .request(async (req, { cacheIds }) => {
      const contactId = cacheIds.contactId

      if (contactId === null || contactId === undefined) {
        return null
      }

      return req.delete(`marketing/contacts?ids=${contactId}`)
    })
}

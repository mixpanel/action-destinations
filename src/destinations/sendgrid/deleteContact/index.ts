import { get } from 'lodash'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { DeleteContact } from './generated-types'

// SendGrid uses a custom "SGQL" query language for finding contacts. To protect us from basic
// injection attacks (e.g. "email = 'x@x.com' or email like '%@%'"), we can just strip all quotes
// from untrusted values.
const sgqlEscape = (s: string): string => {
  return s.replace(/['"]/g, '')
}

const definition: ActionDefinition<Settings, DeleteContact> = {
  schema: {
    $schema: 'http://json-schema.org/schema#',
    title: 'Delete Contact',
    description: 'Delete a contact from SendGrid.',
    type: 'object',
    additionalProperties: false,
    defaultSubscription: 'type = "delete"',
    properties: {
      email: {
        title: 'Email Address',
        description: 'Email address of the contact to delete.',
        type: 'string',
        defaultMapping: {
          '@template': '{{properties.email}}'
        }
      }
    },
    required: ['email']
  },

  cachedFields: {
    contactId: {
      ttl: 60,
      key: ({ payload }) => payload.email,
      value: async (req, { payload }) => {
        const search = await req.post('marketing/contacts/search', {
          json: {
            query: `email = '${sgqlEscape(payload.email)}'`
          }
        })
        return get(search.body, 'result[0].id')
      }
    }
  },

  perform: (req, { cachedFields }) => {
    const contactId = cachedFields.contactId

    if (contactId === null || contactId === undefined) {
      return null
    }

    return req.delete(`marketing/contacts?ids=${contactId}`)
  }
}

export default definition

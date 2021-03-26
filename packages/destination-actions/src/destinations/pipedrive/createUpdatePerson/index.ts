import { Options } from 'got'
import dayjs from '../../../lib/dayjs'
import { ActionDefinition } from '../../../lib/destination-kit/action'
import { get } from '../../../lib/get'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

interface Organizations {
  data: Organization[]
  additional_data: {
    pagination: {
      next_start?: number
    }
  }
}

interface Organization {
  id: string
  name: string
}

interface Person {
  name: string
  org_id?: number
  email?: string[]
  phone?: string
  add_time?: string
}

const action: ActionDefinition<Settings, Payload> = {
  title: 'Create or Update Person',
  description: "Update a person in Pipedrive or create them if they don't exist yet.",
  defaultSubscription: 'type = "identify"',
  fields: {
    identifier: {
      title: 'Person ID',
      description:
        'Identifier used to find existing person in Pipedrive. Can be an email, name, phone number, or custom field value. Custom person fields may be included by using the long hash keys of the custom fields. These look like "33595c732cd7a027c458ea115a48a7f8a254fa86".',
      type: 'string',
      required: true,
      default: {
        '@path': '$.userId'
      }
    },
    name: {
      title: 'Person Name',
      type: 'string',
      required: true
    },
    org_id: {
      title: 'Organization ID',
      description: 'ID of the organization this person will belong to.',
      type: 'number',
      autocomplete: true
    },
    email: {
      title: 'Email Address',
      description: 'Email addresses for this person.',
      type: 'array',
      items: {
        type: 'string'
      }
    },
    phone: {
      title: 'Phone Number',
      description: 'Phone number for the person.',
      type: 'string'
    },
    add_time: {
      title: 'Created At',
      description: 'If the person is created, use this timestamp as the creation timestamp. Format: YYY-MM-DD HH:MM:SS',
      type: 'string'
    }
  },

  autocompleteFields: {
    org_id: async (req, { page }) => {
      const searchParams: Options['searchParams'] = {}
      if (typeof page === 'string') {
        searchParams.start = Number(page)
      }

      const response = await req.get<Organizations>('organizations', {
        searchParams
      })

      const items = response.body.data.map((organization) => ({
        label: organization.name,
        value: organization.id
      }))

      let nextPage: string | undefined

      if (typeof response.body.additional_data.pagination.next_start === 'number') {
        nextPage = String(response.body.additional_data.pagination.next_start)
      }

      return {
        body: {
          data: items,
          pagination: { nextPage }
        }
      }
    }
  },

  cachedFields: {
    personId: {
      ttl: 60,
      key: ({ payload }) => payload.identifier,
      value: async (req, { payload }) => {
        const search = await req.get('persons/search', {
          searchParams: { term: payload.identifier }
        })
        return get(search.body, 'data.items[0].item.id')
      }
    }
  },

  perform: (req, { payload, cachedFields }) => {
    const personId = cachedFields.personId

    const person: Person = {
      name: payload.name,
      org_id: payload.org_id,
      email: payload.email,
      phone: payload.phone
    }

    if (personId === undefined || personId === null) {
      if (payload.add_time) {
        person.add_time = dayjs.utc(person.add_time).format('YYYY-MM-DD HH:MM:SS')
      }

      return req.post('persons', { json: person })
    }

    return req.put(`persons/${personId}`, { json: person })
  }
}

export default action

import { get } from 'lodash'
import dayjs from '@/lib/dayjs'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { CreateOrUpdatePerson } from './generated-types'
import schema from './payload.schema.json'

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

const definition: ActionDefinition<Settings, CreateOrUpdatePerson> = {
  schema,

  autocompleteFields: {
    org_id: async (req, { page }) => {
      const response = await req.get<Organizations>('organizations', {
        searchParams: {
          start: typeof page === 'string' ? Number(page) : undefined
        }
      })

      const items = response.body.data.map(organization => ({
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

export default definition

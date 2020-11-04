import { get } from 'lodash'
import dayjs from '@/lib/dayjs'
import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { CreateOrUpdatePerson } from './generated-types'

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

export default function(action: Action<Settings, CreateOrUpdatePerson>): Action<Settings, CreateOrUpdatePerson> {
  return action
    .validatePayload(payloadSchema)

    .autocomplete('org_id', async (req, { page }) => {
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
    })

    .cachedRequest({
      ttl: 60,
      key: ({ payload }) => payload.identifier,
      value: async (req, { payload }) => {
        const search = await req.get('persons/search', {
          searchParams: { term: payload.identifier }
        })
        return get(search.body, 'data.items[0].item.id')
      },
      as: 'personId'
    })

    .request(async (req, { payload, cacheIds }) => {
      const personId = cacheIds.personId

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
    })
}

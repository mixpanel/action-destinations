import { get } from 'lodash'
import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

interface Organizations {
  data: Organization[]
  additional_data: {
    pagination: {
      next_start: string
    }
  }
}

interface Organization {
  id: string
  name: string
}

export default function(action: Action): Action {
  return action
    .validatePayload(payloadSchema)

    .autocomplete('org_id', async (req, { page }) => {
      const response = await req.get<Organizations>('organizations', {
        searchParams: { start: page }
      })

      const items = response.body.data.map(organization => ({
        label: organization.name,
        value: organization.id
      }))

      let nextPage

      if (typeof response.body.additional_data.pagination.next_start === 'number') {
        nextPage = response.body.additional_data.pagination.next_start
      }

      return {
        body: {
          data: items,
          pagination: { nextPage }
        }
      }
    })

    .mapField('$.add_time', {
      '@timestamp': {
        timestamp: { '@path': '$.add_time' },
        format: 'YYYY-MM-DD HH:MM:SS'
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

    .request(async (req, { payload, personId }) => {
      const { identifier, ...person } = payload

      if (personId === undefined || personId === null) {
        return req.post('persons', { json: person })
      } else {
        // Don't need add_time if we're only upading the person
        const { add_time: x, ...cleanPerson } = person
        return req.put(`persons/${personId}`, { json: cleanPerson })
      }
    })
}

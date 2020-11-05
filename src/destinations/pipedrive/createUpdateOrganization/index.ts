import { get } from 'lodash'
import dayjs from '@/lib/dayjs'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { CreateOrUpdateOrganization } from './generated-types'
import schema from './payload.schema.json'

const definition: ActionDefinition<Settings, CreateOrUpdateOrganization> = {
  schema,

  cachedFields: {
    organizationId: {
      ttl: 60,
      key: ({ payload }) => payload.identifier,
      value: async (req, { payload }) => {
        const search = await req.get('organizations/search', {
          searchParams: { term: payload.identifier }
        })
        return get(search.body, 'data.items[0].item.id')
      }
    }
  },

  perform: (req, { payload, cachedFields }) => {
    const organizationId = cachedFields.organizationId

    const organization = {
      name: payload.name,
      owner_id: payload.owner_id
    }

    if (organizationId === undefined || organizationId === null) {
      return req.post('organizations', {
        json: {
          ...organization,
          add_time: payload.add_time ? dayjs.utc(payload.add_time).format('YYYY-MM-DD HH:MM:SS') : undefined
        }
      })
    }

    return req.put(`organizations/${organizationId}`, {
      json: organization
    })
  }
}

export default definition

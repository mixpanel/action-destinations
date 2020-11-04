import { get } from 'lodash'
import dayjs from '@/lib/dayjs'
import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { CreateOrUpdateOrganization } from './generated-types'

export default function(
  action: Action<Settings, CreateOrUpdateOrganization>
): Action<Settings, CreateOrUpdateOrganization> {
  return action
    .validatePayload(payloadSchema)

    .cachedRequest({
      ttl: 60,
      key: ({ payload }) => payload.identifier,
      value: async (req, { payload }) => {
        const search = await req.get('organizations/search', {
          searchParams: { term: payload.identifier }
        })
        return get(search.body, 'data.items[0].item.id')
      },
      as: 'organizationId'
    })

    .request(async (req, { payload, cacheIds }) => {
      const organizationId = cacheIds.organizationId

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
    })
}

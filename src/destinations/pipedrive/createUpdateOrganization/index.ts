import { get } from 'lodash'
import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { CreateOrUpdateOrganization } from './generated-types'

export default function(
  action: Action<Settings, CreateOrUpdateOrganization>
): Action<Settings, CreateOrUpdateOrganization> {
  return action
    .validatePayload(payloadSchema)

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
        const search = await req.get('organizations/search', {
          searchParams: { term: payload.identifier }
        })
        return get(search.body, 'data.items[0].item.id')
      },
      as: 'organizationId'
    })

    .request(async (req, { payload, cacheIds }) => {
      const { identifier, ...organization } = payload
      const organizationId = cacheIds.organizationId

      if (organizationId === undefined || organizationId === null) {
        return req.post('organizations', {
          json: organization
        })
      } else {
        // Don't need add_time when we're only updating the org
        const { add_time: x, ...cleanOrganization } = organization

        return req.put(`organizations/${organizationId}`, {
          json: cleanOrganization
        })
      }
    })
}

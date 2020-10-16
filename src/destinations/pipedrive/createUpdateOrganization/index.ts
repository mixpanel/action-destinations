import { get } from 'lodash'
import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
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
      key: ({ payload }) => payload.identifier as string,
      value: async (req, { payload }) => {
        const search = await req.get('organizations/search', {
          searchParams: { term: payload.identifier }
        })
        return get(search.body, 'data.items[0].item.id')
      },
      as: 'organizationId'
    })

    .request(async (req, { payload, organizationId }) => {
      const { identifier, ...organization } = payload

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

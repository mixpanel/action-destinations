const get = require('lodash/get')

module.exports = action => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  .mapField('$.add_time', {
    '@timestamp': {
      timestamp: { '@path': '$.add_time' },
      format: 'YYYY-MM-DD HH:MM:SS'
    }
  })

  .cachedRequest({
    ttl: 60,
    key: ({ payload }) => (payload.identifier),
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
      return req.post('organizations', { json: organization })
    } else {
      // Don't need add_time when we're only updating the org
      const { add_time: x, ...cleanOrganization } = organization
      return req.put(`organizations/${organizationId}`, { json: cleanOrganization })
    }
  })

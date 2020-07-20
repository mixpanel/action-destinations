const get = require('lodash/get')

module.exports = action => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  .mapField('$.organization.add_time', {
    '@timestamp': {
      timestamp: { '@path': '$.organization.add_time' },
      format: 'YYYY-MM-DD HH:MM:SS'
    }
  })

  .cachedRequest({
    ttl: 60,
    key: ({ payload }) => (payload.organizationIdentifier),
    value: async (req, { payload }) => {
      const search = await req.get('organizations/search', {
        searchParams: { term: payload.organizationIdentifier }
      })
      return get(search.body, 'data.items[0].item.id')
    },
    as: 'organizationId'
  })

  .request(async (req, { payload, organizationId }) => {
    if (organizationId === undefined || organizationId === null) {
      return req.post('organizations', { json: payload.organization })
    } else {
      const { add_time: x, ...organization } = payload.organization
      return req.put(`organizations/${organizationId}`, { json: organization })
    }
  })

const lodash = require('lodash')

module.exports = (action) => {
  action
    // TODO make these automatic
    .validatePayload(require('./payload.schema.json'))

    .map(
      {
        organization: {
          add_time: {
            '@timestamp': {
              timestamp: { '@path': '$.organization.add_time' },
              format: 'YYYY-MM-DD HH:MM:SS'
            }
          }
        }
      },
      { merge: true }
    )
    .request(async (req, { payload }) => {
      const search = await req.get('organizations/search', {
        searchParams: { term: payload.organizationIdentifier }
      })

      const organizationId = lodash.get(search.body, 'data.items[0].item.id')

      if (organizationId !== null && organizationId !== undefined) {
        const { add_time: x, ...organization } = payload.organization
        return req.put(`organizations/${organizationId}`, { json: organization })
      } else {
        return req.post('organizations', { json: payload.organization })
      }
    })
}

const get = require('lodash/get')

module.exports = action => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  .cachedRequest({
    ttl: 60,
    key: ({ payload }) => (payload.personIdentifier),
    value: async (req, { payload }) => {
      const search = await req.get('persons/search', {
        searchParams: { term: payload.personIdentifier }
      })
      return get(search.data, 'data.items[0].item.id')
    },
    as: 'personId'
  })

  .request(async (req, { payload, personId }) => {
    if (personId === undefined || personId === null) {
      return null
    }
    return req.delete(`persons/${personId}`)
  })

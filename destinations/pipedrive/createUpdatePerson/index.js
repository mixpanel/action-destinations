const get = require('lodash/get')

module.exports = action => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  .mapField('$.person.add_time', {
    '@timestamp': {
      timestamp: { '@path': '$.person.add_time' },
      format: 'YYYY-MM-DD HH:MM:SS'
    }
  })

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
      return req.post('persons', { json: payload.person })
    } else {
      const { add_time: x, ...person } = payload.person
      return req.put(`persons/${personId}`, { json: person })
    }
  })

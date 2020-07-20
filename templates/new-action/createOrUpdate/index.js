module.exports = action => action
  .validatePayload(require('./payload.schema.json'))

  .cachedRequest({
    ttl: 60,
    key: ({ payload }) => payload.email,
    value: async (req, { payload }) => {
      const user = await req.get('users/search', {
        searchParams: { email: payload.email }
      })
      return user.body.id
    },
    as: 'userId'
  })

  .request(async (req, { payload, userId }) => {
    if (userId === undefined || userId === null) {
      return req.post('http://example.com/users', {
        json: payload
      })
    } else {
      return req.put(`http://example.com/users/${userId}`, {
        json: payload
      })
    }
  })

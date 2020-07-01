module.exports = action => action
  .validatePayload(require('./payload.schema.json'))
  .request(async (req, { payload }) => {
    const user = await req.get('users/search', {
      searchParams: { email: payload.email }
    })

    const userId = user.body.id

    if (userId === undefined) {
      return req.post('http://example.com/users', {
        json: { payload }
      })
    } else {
      return req.put(`http://example.com/users/${userId}`, {
        json: payload
      })
    }
  })

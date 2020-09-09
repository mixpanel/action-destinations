module.exports = action =>
  action
    .validatePayload(require('./payload.schema.json'))

    .cachedRequest({
      ttl: 10,
      key: ({ payload }) => payload.number,
      value: async (req, { payload }) => {
        const url = `http://numbersapi.com/${payload.number}/trivia`
        const resp = await req.get(url, { responseType: 'text' })
        payload.properties.number = {
          value: payload.number,
          trivia: resp.body
        }
        delete payload.number
        return resp
      },
      as: 'trivia'
    })

    .request((req, { settings, trivia }) =>
      req.post(settings.url, { json: trivia })
    )

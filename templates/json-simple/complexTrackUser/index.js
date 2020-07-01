module.exports = (action) => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  .request(async (req, { payload }) => {
    const resp = await req.get(`${payload.number}/trivia`, {
      prefixUrl: 'http://numbersapi.com',
      responseType: 'text'
    })
    payload.properties.number = {
      value: payload.number,
      trivia: resp.body
    }
    delete payload.number
    return resp
  })
  .request((req, { payload, settings }) => (
    req.post('', { json: payload })
  ))

// TODO format date
module.exports = (action) => action
  .validatePayload(require('./payload.schema.json'))
  .request((req, { payload, settings }) => (
    req.post(
      'https://amplitude.com/api/2/annotations',
      {
        form: payload
      })
  ))

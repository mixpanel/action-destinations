module.exports = (action) => action
  .validatePayload(require('./payload.schema.json'))
  .request((req, { payload, settings }) => (
    req.post('', { json: payload })
  ))

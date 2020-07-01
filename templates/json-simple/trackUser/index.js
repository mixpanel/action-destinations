module.exports = (action) => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))
  .request((req, { payload, settings }) => (
    req.post('', { json: payload })
  ))

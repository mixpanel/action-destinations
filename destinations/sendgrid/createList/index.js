module.exports = action => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  .request(async (req, { payload }) => (
    req.post('/marketing/lists', { json: payload })
  ))

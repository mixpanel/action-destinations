module.exports = action => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  .request(async (req, { payload }) => {
    return req.post('events', { json: payload })
  })

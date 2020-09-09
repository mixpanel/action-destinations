module.exports = action =>
  action
    .validatePayload(require('./payload.schema.json'))
    .request((req, { payload, settings }) =>
      req.post('http://example.com', { json: payload })
    )

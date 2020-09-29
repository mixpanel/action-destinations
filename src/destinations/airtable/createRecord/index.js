module.exports = action =>
  action
    .validatePayload(require('./payload.schema.json'))
    .request((req, { payload }) =>
      req.post(payload.url, { json: { records: [{ fields: payload.fields }] } })
    )

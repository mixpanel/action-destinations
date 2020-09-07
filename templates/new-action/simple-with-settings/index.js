module.exports = action =>
  action
    .validateSettings(require('./settings.schema.json'))
    .validatePayload(require('./payload.schema.json'))
    .request((req, { payload, settings }) =>
      req.post(settings.url, { json: payload }),
    )

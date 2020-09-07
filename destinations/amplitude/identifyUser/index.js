module.exports = action =>
  action
    .validatePayload(require('./payload.schema.json'))
    .request((req, { payload, settings }) =>
      req.post('https://api.amplitude.com/identify', {
        form: {
          api_key: settings.apiKey,
          identification: JSON.stringify(payload),
        },
      }),
    )

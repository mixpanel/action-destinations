module.exports = (action) => action
  .validatePayload(require('./payload.schema.json'))

  .mapField('$.date', {
    '@timestamp': {
      timestamp: { '@path': '$.date' },
      format: 'x'
    }
  })

  .request((req, { payload, settings }) => (
    req.post(
      'https://amplitude.com/api/2/annotations',
      {
        username: settings.apiKey,
        password: settings.secretKey,
        form: payload
      })
  ))

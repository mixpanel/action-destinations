module.exports = (action) => action
  .validatePayload(require('./payload.schema.json'))

  .mapField('$.time', {
    '@timestamp': {
      timestamp: { '@path': '$.time' },
      format: 'x'
    }
  })

  .mapField('$.session_id', {
    '@timestamp': {
      timestamp: { '@path': '$.session_id' },
      format: 'x'
    }
  })

  .request((req, { payload, settings }) => (
    req.post(
      'https://api2.amplitude.com/2/httpapi',
      {
        json: {
          api_key: settings.apiKey,
          events: [payload]
        }
      }
    )
  ))

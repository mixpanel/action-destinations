module.exports = (action) => action
  .validatePayload(require('./payload.schema.json'))

  .mapField('$.ignore_invalid_id', {
    '@if': {
      true: { '@path': '$.ignore_invalid_id' },
      then: 'True',
      else: 'False'
    }
  })

  .mapField('$.delete_from_org', {
    '@if': {
      true: { '@path': '$.delete_from_org' },
      then: 'True',
      else: 'False'
    }
  })

  .request((req, { payload, settings }) => (
    req.post(
      'https://amplitude.com/api/2/deletions/users',
      {
        username: settings.apiKey,
        password: settings.secretKey,
        json: payload
      }
    )
  ))

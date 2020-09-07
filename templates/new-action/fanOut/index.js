module.exports = action =>
  action
    .validatePayload(require('./payload.schema.json'))

    // Send a separate request for every email address in the 'emails' field of the payload.
    .fanOut({ on: 'payload.emails', as: 'email' })
    .request((req, { payload, email }) => {
      // Remove emails from the final payload
      const { emails, ...cleanPayload } = payload
      req.post('http://example.com', {
        json: { email, ...cleanPayload },
      })
    })
    .fanIn()

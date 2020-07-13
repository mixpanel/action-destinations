module.exports = (action) => action
  .validatePayload(require('./payload.schema.json'))
  .request((req, { payload, settings }) => (
    req.post('', { json: { events: [payload] } })
  ))

// TODO convert 'time' to ms since epoch
// TODO convert 'session_id' to ms since epoch

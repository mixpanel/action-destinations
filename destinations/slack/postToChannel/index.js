module.exports = (action) => action
  // TODO make these automatic
  .validateSettings(require('./settings.schema.json'))
  .validatePayload(require('./payload.schema.json'))

  .fanOut({ on: 'settings.channels', as: 'channel' })
  .request((req, { payload, settings, channel }) => (
    req.post(settings.url, { json: { ...payload, channel } })
  ))
  .fanIn()

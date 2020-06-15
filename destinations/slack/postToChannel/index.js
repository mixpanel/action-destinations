// TODO remove need for this
require('../../../lib/action-kit')

module.exports = action()
  // TODO make these automatic
  .validateSettings(require('./settings.schema.json'))
  .validatePayload(require('./payload.schema.json'))

  .fanOut({ on: 'settings.channels', as: 'channel' })
  .deliver(({ payload, settings, channel }) => (
    fetch(settings.url, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, channel })
    })
  ))
  .fanIn()

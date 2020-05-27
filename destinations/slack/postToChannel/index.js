// TODO remove need for this
require('../../../action-kit')

export default action()
  // TODO is there a better way to include settings/schema without manual config?
  .settings(require('./settings.json'))
  .schema(require('./schema.json'))
  .fanOut({ on: 'settings.channels', as: 'channel' })
  .deliver(({ payload, settings, channel }) => (
    fetch(settings.url, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, channel })
    })
  ))
  .fanIn()

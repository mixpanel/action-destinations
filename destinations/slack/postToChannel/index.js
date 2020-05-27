const action = require('../../../action-kit')

// TODO we should use a custom funk buildpack so we can skip this.
// eslint-disable-next-line no-use-before-define
const fetch = window.fetch || function () { throw new Error('node-fetch isn\'t available') }

module.exports = action()
  // TODO is there a better way to automatically include settings and schema?
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

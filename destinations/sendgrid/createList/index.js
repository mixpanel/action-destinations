// TODO remove need for this
require('../../../lib/action-kit')

module.exports = action()
  // TODO make this automatic
  .schema(require('./schema.json'))

  .deliver(({ payload, settings }) => (
    fetch(
      'https://api.sendgrid.com/v3/contactdb/lists',
      {
        method: 'post',
        headers: {
          Authorization: `Bearer ${settings.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )
  ))

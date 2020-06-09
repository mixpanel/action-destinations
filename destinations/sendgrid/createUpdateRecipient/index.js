// TODO remove need for this
require('../../../lib/action-kit')

module.exports = action()
  // TODO make these automatic
  .schema(require('./schema.json'))
  .map(require('./mapping.json'))

  .deliver(({ payload, settings }) => (
    fetch(
      'https://api.sendgrid.com/v3/contactdb/recipients',
      {
        method: 'patch',
        headers: {
          Authorization: `Bearer ${settings.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )
  ))

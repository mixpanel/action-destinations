// TODO remove need for this
require('../../../lib/action-kit')

export default action()
  // TODO make these automatic
  .schema(require('./schema.json'))
  .map(require('./mapping.json'))

  .deliver(({ payload, settings }) => (
    fetch(
      `https://api.sendgrid.com/v3/contactdb/lists/${payload.list_id}/recipients/${payload.recipient_id}`,
      {
        method: 'delete',
        headers: { Authorization: `Bearer ${settings.api_key}` }
      }
    )
  ))

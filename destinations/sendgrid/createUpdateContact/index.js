// TODO remove need for this
require('../../../lib/action-kit')

module.exports = action()
  // TODO make these automatic
  .validateSettings(require('../settings.schema.json'))
  .validatePayload(require('./payload.schema.json'))

  .deliver(({ payload, settings }) => {
    const { list_id: listId, contact } = payload

    return fetch(
      'https://api.sendgrid.com/v3/marketing/contacts',
      {
        method: 'put',
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          list_ids: [listId],
          contacts: [contact]
        })
      }
    )
  })

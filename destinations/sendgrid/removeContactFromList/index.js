const lodash = require('lodash')

// TODO remove need for this
require('../../../lib/action-kit')

// SendGrid uses a custom "SGQL" query language for finding contacts. To protect us from basic
// injection attacks (e.g. "email = 'x@x.com' or email like '%@%'"), we can just strip all quotes
// from untrusted values.
const sgqlEscape = (s) => {
  return s.replace(/['"]/g, '')
}

module.exports = action()
  // TODO make these automatic
  .validateSettings(require('../settings.schema.json'))
  .validatePayload(require('./payload.schema.json'))

  .deliver(async ({ payload, settings }) => {
    const query = `email = '${sgqlEscape(payload.email)}' AND CONTAINS(list_ids, '${sgqlEscape(payload.list_id)}')`
    const resp = await fetch(
      'https://api.sendgrid.com/v3/marketing/contacts/search',
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({ query })
      }
    )

    if (!resp.ok) throw new Error(await resp.text())

    const id = lodash.get(await resp.json(), 'result[0].id')

    // TODO .deliver() has to return a fetch() response currently but we need to relax that
    // requirement.
    if (!id) return null

    return fetch(
        `https://api.sendgrid.com/v3/marketing/lists/${payload.list_id}/contacts?contact_ids=${id}`,
        {
          method: 'delete',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`
          }
        }
    )
  })

// TODO remove need for this
require('../../../lib/action-kit')

const lodash = require('lodash')

module.exports = action()
  // TODO make these automatic
  .validateSettings(require('../settings.schema.json'))
  .validatePayload(require('./payload.schema.json'))

  .map(
    {
      person: {
        add_time: {
          '@timestamp': {
            timestamp: { '@path': '$.person.add_time' },
            format: 'YYYY-MM-DD HH:MM:SS'
          }
        }
      }
    },
    { merge: true }
  )
  .deliver(async ({ payload, settings }) => {
    const url = (path, params = {}) => {
      const qs = (new URLSearchParams({ api_token: settings.apiToken, ...params })).toString()
      return `https://${settings.domain}.pipedrive.com/api/v1/${path}?${qs}`
    }

    const headers = { 'Content-Type': 'application/json' }

    const resp = await fetch(
      url('persons/search', { term: payload.personIdentifier }),
      { headers }
    )
    if (!resp.ok) throw new Error(`Failed to find person in pipedrive, got: ${resp.status} ${resp.statusText}`)

    const body = await resp.json()
    const personId = lodash.get(body, 'data.items[0].item.id')

    if (personId) {
      const { add_time: x, ...person } = payload.person
      // Update person
      return fetch(url(`persons/${personId}`), {
        method: 'put',
        headers,
        body: JSON.stringify(person)
      })
    } else {
      // Create person
      return fetch(url('persons'), {
        method: 'post',
        headers,
        body: JSON.stringify(payload.person)
      })
    }
  })

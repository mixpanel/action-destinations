// TODO remove need for this
require('../../../lib/action-kit')

const querystring = require('querystring')

export default action()
  // TODO make these automatic
  .schema(require('./schema.json'))
  // TODO need a *much* better way to map a single value. Maybe `.mapField`?
  .map({
    '@merge': [
      { '@root': {} },
      {
        person: {
          '@merge': [
            { '@path': 'person' },
            {
              add_time: {
                '@timestamp': {
                  timestamp: { '@field': 'person.add_time' },
                  format: 'YYYY-MM-DD HH:MM:SS'
                }
              }
            }
          ]
        }
      }
    ]
  })
  .deliver(async ({ payload, settings }) => {
    const url = (path, params = {}) => {
      const qs = querystring.stringify({ api_token: settings.apiToken, ...params })

      return `https://${settings.domain}.pipedrive.com/api/v1/${path}?${qs}`
    }

    const resp = await fetch(url('persons/search', { term: payload.personIdentifier }))
    if (!resp.ok) throw new Error(`Failed to find person in pipedrive, got: ${resp.status} ${resp.statusText}`)

    const body = await resp.json()
    let personId = null
    try {
      if (body.data.length > 0) personId = body.data[0].item.id
    } catch (e) {
      throw new Error(`Pipedrive response was missing an expected field: ${e.message}`)
    }

    if (personId) {
      // Update person
      return fetch(url(`persons/${personId}`), { method: 'delete' })
    }
  })

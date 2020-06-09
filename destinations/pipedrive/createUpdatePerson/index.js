// TODO remove need for this
require('../../../lib/action-kit')

module.exports = action()
  // TODO make these automatic
  .schema(require('./schema.json'))
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
      return fetch(url('persons'), {
        method: 'put',
        body: JSON.stringify({
          id: personId,
          ...payload.person
        })
      })
    } else {
      // Create person
      return fetch(url('persons'), {
        method: 'post',
        body: JSON.stringify(payload.person)
      })
    }
  })

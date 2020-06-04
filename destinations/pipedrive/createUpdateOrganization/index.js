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
        organization: {
          '@merge': [
            { '@path': 'organization' },
            {
              add_time: {
                '@timestamp': {
                  timestamp: { '@field': 'organization.add_time' },
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

    const resp = await fetch(url('organizations/search', { term: payload.organizationIdentifier }))
    if (!resp.ok) throw new Error(`Failed to find organization in pipedrive, got: ${resp.status} ${resp.statusText}`)

    const body = await resp.json()
    let organizationId = null
    try {
      if (body.data.length > 0) organizationId = body.data[0].item.id
    } catch (e) {
      throw new Error(`Pipedrive response was missing an expected field: ${e.message}`)
    }

    if (organizationId) {
      // Update organization
      return fetch(url('organizations'), {
        method: 'put',
        body: JSON.stringify({
          id: organizationId,
          ...payload.organization
        })
      })
    } else {
      // Create organization
      return fetch(url('organizations'), {
        method: 'post',
        body: JSON.stringify(payload.organization)
      })
    }
  })

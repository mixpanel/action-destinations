// TODO remove need for this
require('../../../lib/action-kit')

const lodash = require('lodash')

module.exports = action()
  // TODO make these automatic
  .validateSettings(require('../settings.schema.json'))
  .validatePayload(require('./payload.schema.json'))

  .map(
    {
      organization: {
        add_time: {
          '@timestamp': {
            timestamp: { '@path': '$.organization.add_time' },
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
      url('organizations/search', { term: payload.organizationIdentifier }),
      { headers }
    )
    if (!resp.ok) throw new Error(`Failed to find organization in pipedrive, got: ${resp.status} ${resp.statusText}`)

    const body = await resp.json()
    const organizationId = lodash.get(body, 'data.items[0].item.id')

    if (organizationId) {
      const { add_time: x, ...organization } = payload.organization
      // Update organization
      return fetch(url(`organizations/${organizationId}`), {
        method: 'put',
        headers,
        body: JSON.stringify(organization)
      })
    } else {
      // Create organization
      return fetch(url('organizations'), {
        method: 'post',
        headers,
        body: JSON.stringify(payload.organization)
      })
    }
  })

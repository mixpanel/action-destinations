// TODO remove need for this
require('../../../lib/action-kit')

module.exports = action()
  // TODO make these automatic
  .schema(require('./schema.json'))
  // TODO maybe this kind of thing doesn't need to be a mapping but could just
  // be code?
  .map(
    {
      last_used: {
        '@timestamp': {
          timestamp: { '@path': '$.last_used' },
          format: 'X'
        }
      }
    },
    { merge: true }
  )
  .deliver(async ({ payload, settings }) => {
    const { customer_id: customerId, device_id: deviceId, ...body } = payload
    const userPass = Buffer.from(`${settings.site_id}:${settings.api_key}`)

    return fetch(`https://track.customer.io/api/v1/customers/${customerId}/devices`, {
      method: 'put',
      headers: {
        Authorization: `Basic ${userPass.toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device: { id: deviceId, ...body }
      })
    })
  })

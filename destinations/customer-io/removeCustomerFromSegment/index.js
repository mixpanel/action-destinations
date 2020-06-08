// TODO remove need for this
require('../../../lib/action-kit')

export default action()
  // TODO make these automatic
  .schema(require('./schema.json'))
  .deliver(async ({ payload, settings }) => {
    const { segment_id: segmentId, customer_id: customerId } = payload
    const userPass = Buffer.from(`${settings.site_id}:${settings.api_key}`)

    return fetch(`https://track.customer.io/api/v1/segments/${segmentId}/remove_customers`, {
      method: 'post',
      headers: {
        Authorization: `Basic ${userPass.toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: [customerId] })
    })
  })

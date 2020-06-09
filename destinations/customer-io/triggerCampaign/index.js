// TODO remove need for this
require('../../../lib/action-kit')

module.exports = action()
  // TODO make these automatic
  .schema(require('./schema.json'))
  .deliver(async ({ payload, settings }) => {
    const { id, ...body } = payload
    const userPass = Buffer.from(`${settings.site_id}:${settings.api_key}`)

    return fetch(`https://api.customer.io/v1/api/campaigns/${id}/triggers`, {
      method: 'post',
      headers: {
        Authorization: `Basic ${userPass.toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
  })

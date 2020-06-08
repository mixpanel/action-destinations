// TODO remove need for this
require('../../../lib/action-kit')

export default action()
  // TODO make these automatic
  .schema(require('./schema.json'))
  // TODO maybe this kind of thing doesn't need to be a mapping but could just
  // be code?
  .map(
    {
      created_at: {
        '@timestamp': {
          timestamp: { '@path': '$.created_at' },
          format: 'X'
        }
      }
    },
    { merge: true }
  )
  .deliver(async ({ payload, settings }) => {
    const { id, custom_attributes: customAttrs, ...body } = payload
    const userPass = Buffer.from(`${settings.site_id}:${settings.api_key}`)

    return fetch(`https://track.customer.io/api/v1/customers/${id}`, {
      method: 'put',
      headers: {
        Authorization: `Basic ${userPass.toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...customAttrs, ...body })
    })
  })

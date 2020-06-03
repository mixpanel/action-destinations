// TODO remove need for this
require('../../../lib/action-kit')

export default action()
  // TODO make these automatic
  .schema(require('./schema.json'))
  .map(require('./mapping.json'))
  .cachedFetch(3600, async ({ payload, settings }) => {
    const resp = await fetch(
      `https://${settings.domain}.pipedrive.com/api/v1/persons/search?api_token=${settings.api_token}`,
      {
        method: 'get',
        body: JSON.stringify({
          term: payload.email
        })
      }
    )
    if (resp.ok) {
      const body = await resp.json()
      // TODO
      return body.data[0].item.id
    }
  })
  .deliver(async ({ payload, settings }) => {
    const send = (method) => (
      fetch(`https://${settings.domain}.pipedrive.com/api/v1/persons?api_token=${settings.api_token}`, {
        method,
        body: JSON.stringify(payload)
      })
    )

    const res = await send('put')
    if (res.status === 404) {
      return send('post')
    }
    return res
  })

'use strict'

module.exports = async (req, { settings }) => {
  const response = await req.get(
    'https://beta-api.customer.io/v1/api/segments',
    {
      prefixUrl: '',
      headers: {
        Authorization: `Bearer ${settings.appApiKey}`
      }
    }
  )

  const items = response.body.segments.map(segment => ({
    label: segment.name,
    value: segment.id
  }))

  return {
    body: {
      data: items,
      pagination: {}
    }
  }
}

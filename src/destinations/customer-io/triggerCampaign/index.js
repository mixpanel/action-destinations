module.exports = action =>
  action
    // TODO make these automatic
    .validatePayload(require('./payload.schema.json'))
    .autocomplete('id', async (req, { settings }) => {
      const response = await req.get(
        'https://beta-api.customer.io/v1/api/campaigns',
        {
          prefixUrl: '',
          headers: {
            Authorization: `Bearer ${settings.appApiKey}`
          }
        }
      )

      const items = response.body.campaigns.map(campaign => ({
        label: campaign.name,
        value: campaign.id
      }))

      return {
        body: {
          data: items,
          pagination: {}
        }
      }
    })

    .request(async (req, { payload }) => {
      const { id, ...body } = payload
      return req.post(
        `https://api.customer.io/v1/api/campaigns/${id}/triggers`,
        { json: body }
      )
    })

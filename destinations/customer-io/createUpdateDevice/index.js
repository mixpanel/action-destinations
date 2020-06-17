module.exports = (action) => {
  action
    // TODO make these automatic
    .validatePayload(require('./payload.schema.json'))

    // TODO maybe this kind of thing doesn't need to be a mapping but could just be code?
    .map(
      {
        created_at: {
          '@timestamp': {
            timestamp: { '@path': '$.last_used' },
            format: 'X'
          }
        }
      },
      { merge: true }
    )

    .request(async (req, { payload }) => {
      const { person_id: customerId, device_id: deviceId, ...body } = payload
      return req.put(`customers/${customerId}/devices`, {
        json: { device: { id: deviceId, ...body } }
      })
    })
}

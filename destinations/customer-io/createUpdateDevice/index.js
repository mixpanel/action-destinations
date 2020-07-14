module.exports = action => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  .mapField('$.last_used', {
    '@timestamp': {
      timestamp: { '@path': '$.last_used' },
      format: 'X'
    }
  })

  .request(async (req, { payload }) => {
    const { person_id: customerId, device_id: deviceId, ...body } = payload
    return req.put(`customers/${customerId}/devices`, {
      json: { device: { id: deviceId, ...body } }
    })
  })

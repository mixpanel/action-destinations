module.exports = action => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  .mapField('created_at', {
    '@timestamp': {
      timestamp: { '@path': '$.created_at' },
      format: 'X'
    }
  })

  .request(async (req, { payload }) => {
    const { id, custom_attributes: customAttrs, ...body } = payload
    return req.put(`customers/${id}`, {
      json: { ...customAttrs, ...body }
    })
  })

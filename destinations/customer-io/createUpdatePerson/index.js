module.exports = action => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  // TODO maybe this kind of thing doesn't need to be a mapping but could just be code?
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

  .request(async (req, { payload }) => {
    const { id, custom_attributes: customAttrs, ...body } = payload
    return req.put(`customers/${id}`, {
      json: { ...customAttrs, ...body }
    })
  })

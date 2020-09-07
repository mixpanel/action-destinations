module.exports = action =>
  action
    // TODO make these automatic
    .validatePayload(require('./payload.schema.json'))

    .request(async (req, { payload }) => {
      const { id, ...body } = payload
      return req.post(`customers/${id}/events`, { json: body })
    })

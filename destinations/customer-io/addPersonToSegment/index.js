module.exports = (action) => {
  action
    // TODO make these automatic
    .validatePayload(require('./payload.schema.json'))

    .request(async (req, { payload }) => {
      const { segmentId, personId } = payload
      return req.put(`segments/${segmentId}/add_customers`, {
        json: { ids: [personId] }
      })
    })
}

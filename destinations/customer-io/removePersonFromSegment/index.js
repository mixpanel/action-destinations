module.exports = (action) => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  .request(async (req, { payload }) => {
    const { segment_id: segmentId, person_id: customerId } = payload
    return req.post(`segments/${segmentId}/remove_customers`, {
      json: { ids: [customerId] }
    })
  })

const segmentIdAutocomplete = require('../autocomplete/segment_id')

module.exports = action =>
  action
    // TODO make these automatic
    .validatePayload(require('./payload.schema.json'))
    .autocomplete('segment_id', segmentIdAutocomplete)

    .request(async (req, { payload }) => {
      const { segment_id: segmentId, person_id: customerId } = payload
      return req.post(`segments/${segmentId}/remove_customers`, {
        json: { ids: [customerId] }
      })
    })

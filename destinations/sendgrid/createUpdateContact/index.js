module.exports = action => action
  // TODO make these automatic
  .validatePayload(require('./payload.schema.json'))

  .request((req, { payload }) => {
    const { list_id: listId, contact } = payload
    return req.put('/marketing/contacts', {
      json: { list_ids: [listId], contacts: [contact] }
    })
  })

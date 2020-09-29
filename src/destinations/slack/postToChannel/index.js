module.exports = action =>
  action
    // TODO make these automatic
    .validatePayload(require('./payload.schema.json'))

    .fanOut({ on: 'payload.channels', as: 'channel' })
    .request((req, { payload, channel }) =>
      req.post(payload.url, {
        json: {
          channel,
          text: payload.text,
          username: payload.username,
          icon_url: payload.icon_url
        },
        responseType: 'text'
      })
    )
    .fanIn()

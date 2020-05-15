const actionKit = {
  action () {
    return {}
  }
}

actionKit.action()
  .fanOut({ on: 'settings.channels', as: 'channel' })
  .deliver(({ payload, settings, channel }) => {
    return actionKit
      .post('https://slack.com/api/chat.postMessage')
      .set('Authorization', `Bearer ${settings.token}`)
      .send({
        ...payload,
        channel
      })
  })
  .fanIn()

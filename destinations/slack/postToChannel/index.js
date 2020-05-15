class Action {
  constructor () {
    this.steps = [
      new ValidateSettings(require('./settings.json')),
      new ValidateSchema(require('./schema.json'))
    ]
  }

  // -- entrypoint

  _execute (ctx) {
    let result = null
    this.steps.forEach((node) => {
      result = node._execute(ctx)
    })
    return result
  }

  // -- setup functions

  fanOut () {
    const fo = new FanOut(this)
    this.steps.push(fo)
    return fo
  }
}

class ValidateSettings {
  constructor (config) {
    this.config = config
  }

  _execute ({ settings }) {
    // TODO
    settings.validated = true // TODO remove
  }
}

class ValidateSchema {
  constructor (schema) {
    this.schema = schema
  }

  _execute ({ payload }) {
    const Ajv = require('ajv')
    const valid = (new Ajv()).validate(this.schema, payload)
    if (!valid) {
      console.log('schema validation failed', ajv.errorsText())
    }
    payload.validated = true // TODO remove
  }
}

class FanOut {
  constructor (parent) {
    this.parent = parent
    this.flow = []
  }

  // --

  _execute () {
    if (this.flow.length === 0) throw new Error('fanOut is missing a body')
  }

  // --

  deliver (fn) {
    this.fn = fn
    return this
  }

  fanIn () {
    return this.parent
  }
}

const actionKit = {
  action () {
    return new Action()
  },

  post (url) {
    // TODO
    const foo = {
      set () { return this },
      send () { return this }
    }
    return foo
  }
}

module.exports = actionKit.action()
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

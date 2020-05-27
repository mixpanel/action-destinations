const Ajv = require('ajv') // JSON Schema validator

// Action is the root element/entrypoint for a partner action.
class Action {
  constructor () {
    this.steps = []
  }

  // -- entrypoint

  // TODO break up ctx? validate ctx?
  async _execute (ctx) {
    for (const step of this.steps) {
      await step._execute(ctx)
    }
  }

  // -- builder functions

  settings (config) {
    this.steps.push(new ValidateSettings(config))
    return this
  }

  schema (config) {
    this.steps.push(new ValidateSchema(config))
    return this
  }

  fanOut (opts) {
    const fo = new FanOut(this, opts)
    this.steps.push(fo)
    return fo
  }
}

// ValidateSettings takes a settings configuration and validates that the
// incoming settings are valid. The required settings are present, they're the
// correct type, etc.
class ValidateSettings {
  constructor (config) {
    this.config = config
  }

  _execute ({ settings }) {
    for (const { slug, type, validations = [] } of this.config) {
      const value = settings[slug]

      // Validate type
      const typeFnName = `_${type.toUpperCase()}`
      if (typeof this[typeFnName] !== 'function') throw new Error(`'${type}' is not a valid setting type`)
      this[typeFnName](slug, value)

      // Run validations
      for (const v of validations) {
        // TODO using dynamic names for these functions is obviously weird but
        // an easy hack. fix later.
        const fnName = `_${v.validation.toUpperCase()}`
        if (typeof this[fnName] !== 'function') throw new Error(`'${v.validation}' is not a valid validation slug`)
        this[fnName](slug, v, value) // throws errors for now
      }
    }

    // TODO Should _execute functions return something more useful?
    return 'settings validated successfully'
  }

  // -- validators

  _STRING (slug, value) {
    const type = typeof value
    if (type !== 'string') throw new Error(`${slug} is a ${type}, expected string`)
  }

  _STRINGS (slug, value) {
    if (!Array.isArray(value)) throw new Error(`${slug} is a ${typeof value}, expected array`)
  }

  _LENGTH (slug, { min, max }, value) {
    const length = value.length
    if (typeof length !== 'number') throw new Error(`${slug} setting doesn't have a length because it is a ${typeof value}`)
    if (typeof min === 'number' && length < min) throw new Error(`${slug} setting is too short (${length}, minimum is ${min})`)
    if (typeof max === 'number' && length > max) throw new Error(`${slug} setting is too long (${length}, maximum is ${max})`)
  }
}

// ValidateSchema takes a JSON Schema and validates that the incoming payload
// matches (required fields are present, the right type, etc.)
class ValidateSchema {
  constructor (schema) {
    const ajv = new Ajv({
      // Fill in any missing values with the default values.
      useDefaults: true,
      // Coerce types to be a bit more liberal.
      coerceTypes: true
    })

    this.validate = ajv.compile(schema)
  }

  _execute ({ payload }) {
    const valid = this.validate(payload)
    if (!valid) {
      const message = []
      for (const err of this.validate.errors) {
        message.push(`${err.dataPath || 'root object'}: ${err.message}`)
      }
      throw new Error('TODO Schema validation failed:', message.join(', '))
    }
  }
}

// FanOut allows us to make multiple external requests in parallel based on a
// given array of values.
class FanOut {
  constructor (parent, opts) {
    this.parent = parent
    this.opts = opts
    this.steps = []
  }

  // --

  async _execute (ctx) {
    if (this.steps.length === 0) throw new Error('fanOut is missing a body')
    if (!this.opts.on) throw new Error("fanOut: missing 'on' option")
    if (!this.opts.as) throw new Error("fanOut: missing 'as' option")

    const values = safeGet(ctx, this.opts.on)
    if (!Array.isArray(values)) throw new Error(`fanOut: ${this.opts.on} is not an array, it is a ${typeof this.values}`)
    if (!values) return 'nothing to fan out on' // TODO better return format?

    // Run steps for all values in parallel.
    await Promise.all(
      values.map((val) => this._executeForValue.bind(this)(ctx, this.opts.as, val))
    )
  }

  // Execute each step of the fan-out in sequence with the given context and
  // fan-out key/value pair.
  async _executeForValue (ctx, key, value) {
    // TODO handle ctx better, maybe propagate manually
    const ctxWithValue = { ...ctx, [key]: value }
    for (const step of this.steps) {
      await step._execute(ctxWithValue)
    }
  }

  // --

  deliver (fn) {
    this.steps.push(new Deliver(fn))
    return this
  }

  fanIn () {
    return this.parent
  }
}

// safeGet pulls a field out of a nested object using a dot-notation path. ex.
// safeGet({a: {b: 'cool'}}, 'a.b') === 'cool'
function safeGet (obj, path) {
  // 'a.b\\.c.d' => ['a', 'b.c', 'd']
  const parts = path.split(/(?<!\\)\./)
    .map((s) => s.replace('\\.', '.'))

  let result = obj
  for (const part of parts) {
    result = (result || {})[part]
  }
  return result
}

// Deliver handles delivering a payload to an external API.
//
// TODO handle non-JSON APIs etc etc etc
class Deliver {
  constructor (fn) {
    this.fn = fn
  }

  async _execute (ctx) {
    const resp = await this.fn(ctx)
    return resp.json()
  }
}

module.exports = () => {
  return new Action()
}

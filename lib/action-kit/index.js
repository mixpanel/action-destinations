const { map, validate: validateMapping } = require('../mapping-kit')
const Ajv = require('ajv') // JSON Schema validator

class Step {
  constructor () {
    this.id = `${this.constructor.name}${stepId()}`
  }

  async execute (ctx) {
    this._log('Starting')

    const result = {
      step: this.id,
      output: null,
      error: null,
      startedAt: new Date(),
      finishedAt: null
    }

    try {
      result.output = await this._execute(ctx)
    } catch (e) {
      result.error = e
    } finally {
      result.finishedAt = new Date()
    }

    if (result.error) {
      this._log(`Failed after ${durationMs(result.startedAt, result.finishedAt)}: ${result.error.message}`)
    } else {
      this._log(`Finished (${durationMs(result.startedAt, result.finishedAt)})`)
    }

    return result
  }

  _log (...args) {
    if (process.env.NODE_ENV !== 'test') console.log(`${this.id}:`, ...args)
  }

  toString () {
    return `[step ${this.id}]`
  }
}

const stepId = () => {
  const id = stepId.i || 0
  stepId.i = id + 1
  return id
}

const durationMs = (start, end) => {
  const ms = (end.getTime() - start.getTime()).toString()
  if (ms === '0') return '<1 ms'
  const msWithCommas = ms.replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
  return `${msWithCommas} ms`
}

// Steps accumulates an list of steps and executes them in order.
class Steps {
  constructor (idPrefix = '') {
    this.idPrefix = idPrefix
    this.steps = []
  }

  push (step) {
    if (!(step instanceof Step)) throw new Error(`expected a Step, got ${step}`)
    this.steps.push(step)
  }

  async execute (ctx) {
    if (this.steps.length === 0) throw new Error('no steps defined')

    const results = []

    for (const step of this.steps) {
      const result = await step.execute(ctx)
      results.push(result)
      if (result.error) break
    }

    return results
  }
}

// Entrypoint is the root element/entrypoint for a partner action.
class Entrypoint extends Step {
  constructor () {
    super()
    this.steps = new Steps()
    this.steps.push(new MapPayload())
  }

  // -- entrypoint

  // TODO define ctx fields
  async _execute (ctx) {
    const results = await this.steps.execute(ctx)

    // TODO don't throw
    const finalResult = results[results.length - 1]
    if (finalResult.error) throw finalResult.error

    return results
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

  map (mapping, options = {}) {
    this.steps.push(new MapPayload(mapping, options))
    return this
  }

  fanOut (opts) {
    const fo = new FanOut(this, opts)
    this.steps.push(fo)
    return fo
  }

  do (fn) {
    this.steps.push(new Do(fn))
    return this
  }
}

// ValidateSettings takes a settings configuration and validates that the
// incoming settings are valid. The required settings are present, they're the
// correct type, etc.
class ValidateSettings extends Step {
  constructor (config) {
    super()
    this.config = config
  }

  _execute ({ settings }) {
    for (const { slug, type, validations = [] } of this.config) {
      const value = settings[slug]

      // Validate type
      const typeFnName = `_${type.toUpperCase()}`
      // TODO using dynamic names for these functions is obviously weird but an
      // easy hack. fix later.
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
class ValidateSchema extends Step {
  constructor (schema) {
    super()
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
      // TODO The error messages here are terrible
      throw new Error('Schema validation failed:', message.join(', '))
    }
    return 'payload validated against schema successfully'
  }
}

class MapPayload extends Step {
  constructor (mapping = null, options = {}) {
    super()
    if (mapping) {
      validateMapping(mapping)
    }
    this.mapping = mapping
    this.options = options
  }

  _execute (ctx) {
    const mapping = this.mapping || ctx.mapping
    if (!mapping) return 'no mapping defined'
    const payload = ctx.payload
    const options = this.options
    ctx.payload = map(mapping, payload, options)
    return 'payload mapped successfully'
  }
}

// FanOut allows us to make multiple external requests in parallel based on a
// given array of values.
class FanOut extends Step {
  constructor (parent, opts) {
    super()
    this.parent = parent
    this.opts = opts
    // TODO propagate parent step ID prefix.
    this.steps = new Steps(`${this}-`)
  }

  // --

  async _execute (ctx) {
    if (!this.opts.on) throw new Error("fanOut: missing 'on' option")
    if (!this.opts.as) throw new Error("fanOut: missing 'as' option")

    const values = safeGet(ctx, this.opts.on)
    if (!Array.isArray(values)) throw new Error(`fanOut: ${this.opts.on} is not an array, it is a ${typeof this.values}`)
    if (!values) return 'nothing to fan out on' // TODO better return format?

    // Run steps for all values in parallel.
    return await Promise.all(
      values.map((val) => this._executeForValue.bind(this)(ctx, this.opts.as, val))
    )
  }

  // Execute each step of the fan-out in sequence with the given context and
  // fan-out key/value pair.
  async _executeForValue (ctx, key, value) {
    // TODO handle ctx better, maybe propagate manually
    const ctxWithValue = { ...ctx, [key]: value }
    return await this.steps.execute(ctxWithValue)
  }

  // --

  deliver (fn) {
    const step = new Deliver(fn)
    this._prependStepId(step)
    this.steps.push(step)
    return this
  }

  do (fn) {
    const step = new Do(fn)
    this._prependStepId(step)
    this.steps.push(step)
    return this
  }

  fanIn () {
    return this.parent
  }

  _prependStepId (step) {
    step.id = `${this.id}->${step.id}`
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
class Deliver extends Step {
  constructor (fn) {
    super()
    this.fn = fn
  }

  async _execute (ctx) {
    const resp = await this.fn(ctx)
    if (!resp.ok) {
      throw new Error(`received ${resp.status} ${resp.statusText}`)
    }
    let body = await resp.text()
    try { body = JSON.parse(body) } catch (e) {}
    return body
  }
}

// Do executes a JavaScript function synchronously.
class Do extends Step {
  constructor (fn) {
    super()
    this.fn = fn
  }

  async _execute (ctx) {
    return await this.fn(ctx)
  }
}

global.action = () => {
  return new Entrypoint()
}

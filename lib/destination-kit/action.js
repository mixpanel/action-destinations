const { map } = require('../mapping-kit')
const Ajv = require('ajv') // JSON Schema validator
const { JSONPath } = require('jsonpath-plus')
const got = require('got')

// Step is the base class for all discrete execution steps. It handles executing the step, logging,
// catching errors, and returning a result object.
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

// Steps is a list of one or more Step instances that can be executed in-order.
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

// Entrypoint is the beginning step for all partner actions. Entrypoints always start with the
// MapAndValidateInput step.
class Entrypoint extends Step {
  constructor () {
    super()
    this.steps = new Steps()
    this.steps.push(new MapInput())
    this.requestExtensions = []
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

  validateSettings (schema) {
    this.steps.push(new Validate('Settings are invalid:', 'settings', schema))
    return this
  }

  validatePayload (schema) {
    this.steps.push(new Validate('Payload is invalid:', 'payload', schema))
    return this
  }

  map (mapping, options = {}) {
    this.steps.push(new MapPayload(mapping, options))
    return this
  }

  do (fn) {
    this.steps.push(new Do(fn))
    return this
  }

  fanOut (opts) {
    const fo = new FanOut(this, opts)
    fo.extendRequest(...this.requestExtensions)
    this.steps.push(fo)
    return fo
  }

  extendRequest (...fns) {
    this.requestExtensions.push(...fns)
    return this
  }

  request (fn) {
    this.steps.push(new Request(this.requestExtensions, fn))
    return this
  }
}

class MapInput extends Step {
  _execute (ctx) {
    if (ctx.settings) ctx.settings = map(ctx.settings, ctx.payload)
    if (ctx.mapping) ctx.payload = map(ctx.mapping, ctx.payload)
  }
}

class Validate extends Step {
  constructor (errorPrefix, field, schema) {
    super()
    this.errorPrefix = errorPrefix
    this.field = field

    const ajv = new Ajv({
      // Fill in any missing values with the default values.
      useDefaults: true,
      // Coerce types to be a bit more liberal.
      coerceTypes: true
    })

    this.validate = ajv.compile(schema)
  }

  _execute (ctx) {
    if (!this.validate(ctx[this.field])) {
      throw new Error(`${this.errorPrefix} ${this._ajvErrorMessage(this.validate.errors)}`)
    }
  }

  _ajvErrorMessage (errors) {
    return errors.map(e => {
      return `${e.dataPath || 'root element'} ${e.message}`
    }).join(', ')
  }
}

class MapPayload extends Step {
  constructor (mapping, options = {}) {
    super()
    this.mapping = mapping
    this.options = options
  }

  _execute (ctx) {
    ctx.payload = map(this.mapping, ctx.payload, this.options)
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
    this.steps = new Steps(`${this}-`)
    this.requestExtensions = []
  }

  // --

  async _execute (ctx) {
    if (!this.opts.on) throw new Error("fanOut: missing 'on' option")
    if (!this.opts.as) throw new Error("fanOut: missing 'as' option")

    const values = this._on(this.opts.on, ctx)

    // Run steps for all values in parallel.
    return await Promise.all(
      values.map((val) => this._executeForValue.bind(this)(ctx, this.opts.as, val))
    )
  }

  _on (on, ctx) {
    if (Array.isArray(on)) return on

    let values = null

    const found = JSONPath({ path: on, json: ctx })

    if (found.length > 1) values = found // 'on' path resolves to array
    else values = found[0] // 'on' path points directly to an array

    if (!Array.isArray(values)) throw new Error(`fanOut: ${on} is not an array, it is a ${typeof values}`)
    if (!values) return 'nothing to fan out on' // TODO better return format?

    return values
  }

  // Execute each step of the fan-out in sequence with the given context and
  // fan-out key/value pair.
  async _executeForValue (ctx, key, value) {
    // TODO handle ctx better, maybe propagate manually
    const ctxWithValue = { ...ctx, [key]: value }
    return await this.steps.execute(ctxWithValue)
  }

  // --

  extendRequest (...fns) {
    this.requestExtensions.push(...fns)
    return this
  }

  request (fn) {
    const step = new Request(this._baseRequest, fn)
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

// Request handles delivering a payload to an external API.
//
// TODO handle non-JSON APIs etc etc etc
class Request extends Step {
  constructor (extensions, fn) {
    super()
    this.extensions = extensions || []
    this.fn = fn
  }

  async _execute (ctx) {
    const req = this.extensions.reduce(
      (acc, fn) => (acc.extend(fn(ctx))),
      got.extend({
        // disable automatic retries
        retry: 0,
        // default is no timeout
        timeout: 3000,
        headers: {
          // override got's default of 'got (https://github.com/sindresorhus/got)'
          'user-agent': undefined
        }
      })
    )

    try {
      const resp = await this.fn(req, ctx)
      if (resp === null) return 'TODO: null'
      return resp.body
    } catch (e) {
      if (e.response) {
        // TODO
        console.log(e.response && e.response.body)
        throw new Error(`${e.response.statusCode} ${e.response.statusMessage}`)
      } else {
        console.log(e)
        throw e
      }
    }
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

module.exports = () => {
  return new Entrypoint()
}

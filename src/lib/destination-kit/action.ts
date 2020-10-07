import { map } from '../mapping-kit'
import Ajv from 'ajv' // JSON Schema validator
import { AggregateAjvError } from '@segment/ajv-human-errors'
import { JSONPath } from 'jsonpath-plus'
import got, { ExtendOptions, Got } from 'got'
import NodeCache from 'node-cache'
import get from 'lodash/get'
import logger from '../logger'

const stepId = (): number => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const id = stepId.i || 0
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  stepId.i = id + 1
  return id
}

const durationMs = (start: Date, end: Date): string => {
  const ms = (end.getTime() - start.getTime()).toString()
  if (ms === '0') return '<1 ms'
  const msWithCommas = ms.replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
  return `${msWithCommas} ms`
}

interface StepResult {
  step: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any
  startedAt: Date
  finishedAt: Date | null
}

// Step is the base class for all discrete execution steps. It handles executing the step, logging,
// catching errors, and returning a result object.
class Step {
  id: string

  constructor() {
    this.id = `${this.constructor.name}${stepId()}`
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute(ctx: any): Promise<StepResult> {
    this._log('Starting')

    const result: StepResult = {
      step: this.id,
      output: null,
      error: null,
      startedAt: new Date(),
      finishedAt: null
    }

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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

  _log(message: string): void {
    if (process.env.NODE_ENV !== 'test') {
      logger.info(message)
    }
  }

  toString(): string {
    return `[step ${this.id}]`
  }
}

// Steps is a list of one or more Step instances that can be executed in-order.
class Steps {
  idPrefix: string
  steps: Step[]

  constructor(idPrefix = '') {
    this.idPrefix = idPrefix
    this.steps = []
  }

  push(step: Step): void {
    this.steps.push(step)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute(ctx: any): Promise<any> {
    if (this.steps.length === 0) {
      throw new Error('no steps defined')
    }

    const results = []

    for (const step of this.steps) {
      const result = await step.execute(ctx)

      results.push(result)

      if (result.error) {
        break
      }
    }

    return results
  }
}

class MapInput extends Step {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _execute(ctx: any): void {
    if (ctx.settings) {
      ctx.settings = map(ctx.settings, ctx.payload)
    }

    if (ctx.mapping) {
      ctx.payload = map(ctx.mapping, ctx.payload)
    }
  }
}

export class Validate extends Step {
  errorPrefix: string
  field: string
  validate: Ajv.ValidateFunction

  constructor(errorPrefix: string, field: string, schema: object) {
    super()

    this.errorPrefix = errorPrefix
    this.field = field

    const ajv = new Ajv({
      // Fill in any missing values with the default values.
      useDefaults: true,
      // Coerce types to be a bit more liberal.
      coerceTypes: true,
      // Return all validation errors, not just the first.
      allErrors: true,
      // Include reference to schema and data in error values.
      verbose: true,
      // Use a more parse-able format for JSON paths.
      jsonPointers: true
    })

    this.validate = ajv.compile(schema)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _execute(ctx: any): void {
    if (!this.validate(ctx[this.field])) {
      throw new AggregateAjvError(this.validate.errors)
    }
  }
}

class MapPayload extends Step {
  mapping: object
  options: object

  constructor(mapping: object, options = {}) {
    super()
    this.mapping = mapping
    this.options = options
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _execute(ctx: any): string {
    ctx.payload = map(this.mapping, ctx.payload, this.options)
    return 'payload mapped successfully'
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Extensions = ((ctx: any) => ExtendOptions)[]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RequestFn = (req: Got, ctx: any) => any

// Request handles delivering a payload to an external API. It uses the `got` library under the
// hood.
//
// The callback should be  able to return the raw request instead of needing to do `return
// response.data` etc.
class Request extends Step {
  fn: RequestFn | undefined
  extensions: Extensions

  constructor(extensions: Extensions, fn?: RequestFn) {
    super()
    this.extensions = extensions || []
    this.fn = fn
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _execute(ctx: any): Promise<any> {
    if (!this.fn) {
      return
    }

    const req = this._buildReq(ctx)

    const resp = await this.fn(req, ctx)
    if (resp === null) {
      return 'TODO: null'
    }

    return resp.body
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _buildReq(ctx: any): Got {
    let base = got.extend({
      // disable automatic retries
      retry: 0,
      // default is no timeout
      timeout: 3000,
      headers: {
        // override got's default of 'got (https://github.com/sindresorhus/got)'
        'user-agent': undefined
      }
    })

    for (const extension of this.extensions) {
      base = base.extend(extension(ctx))
    }

    return base
  }
}

interface CachedRequestConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  key: (ctx: any) => string
  value: RequestFn
  as: string
  ttl: number
  negative?: boolean
}

// CachedRequest is like Request but cached. Next question.
class CachedRequest extends Request {
  keyFn: Function
  valueFn: Function
  as: string
  negative: boolean
  cache: NodeCache

  constructor(extensions: Extensions, config: CachedRequestConfig) {
    super(extensions)

    this.keyFn = config.key
    this.valueFn = config.value
    this.as = config.as
    this.negative = config.negative || false

    this.cache = new NodeCache({
      stdTTL: config.ttl,
      maxKeys: 1000
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _execute(ctx: any): Promise<string> {
    const k = this.keyFn(ctx)
    let v = this.cache.get(k)

    if (v !== undefined) {
      ctx[this.as] = v
      return 'cache hit'
    }

    const req = this._buildReq(ctx)

    try {
      v = await this.valueFn(req, ctx)
    } catch (e) {
      if (get(e, 'response.statusCode') === 404) {
        v = null
      } else {
        throw e
      }
    }

    ctx[this.as] = v

    // Only cache if value is not negative *or* negative option is set. Negative caching is off by
    // default because the common cases are: A) auth token generation, which should never be
    // negative, and B) create-or-update patterns, where the resource should exist after the first
    // negative value.
    if ((v !== null && v !== undefined) || this.negative) {
      this.cache.set(k, v)
    }

    return 'cache miss'
  }
}

// Do executes a JavaScript function synchronously.
class Do extends Step {
  fn: Function

  constructor(fn: Function) {
    super()
    this.fn = fn
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _execute(ctx: any): Promise<any> {
    return await this.fn(ctx)
  }
}

interface FanOutOptions {
  on: string
  as: string
}

// FanOut allows us to make multiple external requests in parallel based on a given array of values.
class FanOut extends Step {
  parent: Action
  steps: Steps
  opts: FanOutOptions
  requestExtensions: Extensions

  constructor(parent: Action, opts: FanOutOptions) {
    super()
    this.parent = parent
    this.opts = opts
    this.steps = new Steps(`${this}-`)
    this.requestExtensions = []
  }

  // --

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _execute(ctx: any): Promise<any> {
    const values = this._on(this.opts.on, ctx)

    // Run steps for all values in parallel.
    return await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values.map((val: any) => {
        return this._executeForValue.bind(this)(ctx, this.opts.as, val)
      })
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _on(on: any, ctx: any): any {
    if (Array.isArray(on)) {
      return on
    }

    let values = null

    const found = JSONPath({ path: on, json: ctx })

    if (found.length > 1) values = found
    // 'on' path resolves to array
    else values = found[0] // 'on' path points directly to an array

    if (!Array.isArray(values)) {
      throw new Error(`fanOut: ${on} is not an array, it is a ${typeof values}`)
    }

    if (!values) {
      return 'nothing to fan out on' // TODO better return format?
    }

    return values
  }

  // Execute each step of the fan-out in sequence with the given context and
  // fan-out key/value pair.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _executeForValue(ctx: any, key: string, value: any): Promise<any> {
    // TODO handle ctx better, maybe propagate manually
    const ctxWithValue = { ...ctx, [key]: value }
    return await this.steps.execute(ctxWithValue)
  }

  // --

  cachedRequest(config: CachedRequestConfig): FanOut {
    const step = new CachedRequest([], config)
    this._prependStepId(step)
    this.steps.push(step)
    return this
  }

  extendRequest(...fns: Extensions): FanOut {
    this.requestExtensions.push(...fns)
    return this
  }

  request(fn: RequestFn): FanOut {
    const step = new Request([], fn)
    this._prependStepId(step)
    this.steps.push(step)
    return this
  }

  do(fn: Function): FanOut {
    const step = new Do(fn)
    this._prependStepId(step)
    this.steps.push(step)
    return this
  }

  fanIn(): Action {
    return this.parent
  }

  _prependStepId(step: Step): void {
    step.id = `${this.id}->${step.id}`
  }
}

interface Mapping {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface FieldMapping {
  '@if'?: {
    true: {
      '@path': string
    }
    then: string
    else: string
  }
  '@timestamp'?: {
    timestamp: {
      '@path': string
    }
    format: string
  }
  '@lowercase'?: {
    '@path': string
  }
}

// Action is the beginning step for all partner actions. Entrypoints always start with the
// MapAndValidateInput step.
export class Action extends Step {
  steps: Steps
  requestExtensions: Extensions
  _autocomplete: { [key: string]: RequestFn }

  constructor() {
    super()
    this.steps = new Steps()
    this.steps.push(new MapInput())
    this.requestExtensions = []
    this._autocomplete = {}
  }

  // -- entrypoint

  // TODO define ctx fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _execute(ctx: any): Promise<any> {
    const results = await this.steps.execute(ctx)

    // TODO don't throw
    const finalResult = results[results.length - 1]
    if (finalResult.error) {
      throw finalResult.error
    }

    return results
  }

  // -- builder functions

  validateSettings(schema: object): Action {
    this.steps.push(new Validate('Settings are invalid:', 'settings', schema))
    return this
  }

  validatePayload(schema: object): Action {
    this.steps.push(new Validate('Payload is invalid:', 'payload', schema))
    return this
  }

  autocomplete(field: string, callback: RequestFn): Action {
    this._autocomplete[field] = callback
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executeAutocomplete(field: string, ctx: any): any {
    if (!this._autocomplete[field]) {
      return {
        data: [],
        pagination: {}
      }
    }

    const request = new Request(this.requestExtensions, this._autocomplete[field])

    return request._execute(ctx)
  }

  mapField(path: string, fieldMapping: FieldMapping): Action {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let pathParts = JSONPath.toPathArray(path)
    if (pathParts[0] === '$') {
      pathParts = pathParts.slice(1)
    }

    let mapping: Mapping = {
      '@if': {
        exists: { '@path': path },
        then: fieldMapping
      }
    }

    for (const field of pathParts.reverse()) {
      mapping = { [field]: mapping }
    }

    this.steps.push(new MapPayload(mapping, { merge: true }))

    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  do(fn: any): Action {
    this.steps.push(new Do(fn))
    return this
  }

  fanOut(opts: FanOutOptions): FanOut {
    const fo = new FanOut(this, opts)
    fo.extendRequest(...this.requestExtensions)
    this.steps.push(fo)
    return fo
  }

  extendRequest(...fns: Extensions): Action {
    this.requestExtensions.push(...fns)
    return this
  }

  request(fn: RequestFn): Action {
    this.steps.push(new Request(this.requestExtensions, fn))
    return this
  }

  cachedRequest(config: CachedRequestConfig): Action {
    this.steps.push(new CachedRequest(this.requestExtensions, config))
    return this
  }
}

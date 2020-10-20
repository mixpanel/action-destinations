import { map } from '../mapping-kit'
import Ajv from 'ajv'
import { AggregateAjvError } from '@segment/ajv-human-errors'
import { JSONPath } from 'jsonpath-plus'
import got, { ExtendOptions, Got, Response } from 'got'
import NodeCache from 'node-cache'
import { EventEmitter } from 'events'
import get from 'lodash/get'
import { JSONObject } from '../json-object'
import { Step, Steps, StepResult, ExecuteInput } from './step'
import { lookup, beforeRequest } from '../dns'

class MapInput extends Step {
  executeStep(ctx: ExecuteInput): Promise<string> {
    if (ctx.settings) {
      ctx.settings = map(ctx.settings, ctx.payload)
    }

    if (ctx.mapping) {
      ctx.payload = map(ctx.mapping, ctx.payload)
    }

    return Promise.resolve('MapInput completed')
  }
}

export class Validate extends Step {
  errorPrefix: string
  field: ExecuteInputField
  validate: Ajv.ValidateFunction

  constructor(errorPrefix: string, field: ExecuteInputField, schema: object) {
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

  executeStep(ctx: ExecuteInput): Promise<string> {
    if (!this.validate(ctx[this.field])) {
      throw new AggregateAjvError(this.validate.errors)
    }

    return Promise.resolve('Validate completed')
  }
}

class MapPayload extends Step {
  mapping: JSONObject
  options: JSONObject

  constructor(mapping: JSONObject, options: JSONObject = {}) {
    super()
    this.mapping = mapping
    this.options = options
  }

  executeStep(ctx: ExecuteInput): Promise<string> {
    ctx.payload = map(this.mapping, ctx.payload, this.options)
    return Promise.resolve('MapPayload completed')
  }
}

export type Extensions = ((ctx: ExecuteInput) => ExtendOptions)[]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RequestFn = (req: Got, ctx: any) => any

/**
 * Request handles delivering a payload to an external API. It uses the `got` library under the hood.
 *
 * The callback should be  able to return the raw request instead of needing to do `return response.data` etc.
 */
class Request extends Step {
  requestFn: RequestFn | undefined
  extensions: Extensions

  constructor(extensions: Extensions, requestFn?: RequestFn) {
    super()
    this.extensions = extensions || []
    this.requestFn = requestFn
  }

  async executeStep(ctx: ExecuteInput): Promise<string> {
    if (!this.requestFn) {
      return ''
    }

    const baseRequest = this.baseRequest(ctx)
    const request = this.requestFn(baseRequest, ctx)

    let response: Response
    try {
      response = await request
      this.emit('response', response)
    } catch (e) {
      this.emit('response', e.response)
      throw e
    }

    if (response === null) {
      return 'TODO: null'
    }

    return response.body as string
  }

  baseRequest(ctx: ExecuteInput): Got {
    let base = got.extend({
      // disable automatic retries
      retry: 0,
      // default is no timeout
      timeout: 3000,
      headers: {
        // override got's default of 'got (https://github.com/sindresorhus/got)'
        'user-agent': undefined
      },
      lookup,
      hooks: {
        beforeRequest: [beforeRequest]
      }
    })

    for (const extension of this.extensions) {
      base = base.extend(extension(ctx))
    }

    return base
  }
}

interface CachedRequestConfig {
  key: (ctx: ExecuteInput) => string
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

  async executeStep(ctx: ExecuteInput): Promise<string> {
    const k = this.keyFn(ctx)
    let v = this.cache.get(k)

    if (v !== undefined) {
      return 'cache hit'
    }

    const request = this.baseRequest(ctx)

    try {
      v = await this.valueFn(request, ctx)
    } catch (e) {
      if (get(e, 'response.statusCode') === 404) {
        v = null
      } else {
        throw e
      }
    }

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

  async executeStep(ctx: ExecuteInput): Promise<string> {
    return await this.fn(ctx)
  }
}

interface FanOutOptions {
  on: string
  as: string
}

/**
 * FanOut allows us to make multiple external requests in parallel based on a given array of values.
 */
class FanOut extends Step {
  parent: Action
  steps: Steps
  opts: FanOutOptions
  requestExtensions: Extensions

  constructor(parent: Action, opts: FanOutOptions) {
    super()
    this.parent = parent
    this.opts = opts
    this.steps = new Steps()
    this.requestExtensions = []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async executeStep(ctx: ExecuteInput): Promise<any> {
    const values = this._on(this.opts.on, ctx)

    // Run steps for all values in parallel.
    return await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values.map((val: any) => {
        return this.executeForValue.bind(this)(ctx, this.opts.as, val)
      })
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _on(on: string, ctx: ExecuteInput): any {
    if (Array.isArray(on)) {
      return on
    }

    let values = null

    const found = JSONPath({
      path: on,
      json: ctx
    })

    if (found.length > 1) {
      values = found
    } else {
      values = found[0] // 'on' path points directly to an array
    }

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
  async executeForValue(ctx: ExecuteInput, key: string, value: any): Promise<any> {
    // TODO handle ctx better, maybe propagate manually
    const ctxWithValue = {
      ...ctx,
      [key]: value
    }

    return await this.steps.execute(ctxWithValue)
  }

  // --

  cachedRequest(config: CachedRequestConfig): FanOut {
    const step = new CachedRequest([], config)
    this.steps.push(step)
    return this
  }

  extendRequest(...fns: Extensions): FanOut {
    this.requestExtensions.push(...fns)
    return this
  }

  request(fn: RequestFn): FanOut {
    const step = new Request([], fn)
    this.steps.push(step)
    return this
  }

  do(fn: Function): FanOut {
    const step = new Do(fn)
    this.steps.push(step)
    return this
  }

  fanIn(): Action {
    return this.parent
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

interface ExecuteAutocompleteInput {
  settings: JSONObject
  payload: JSONObject
  page: string
}

type ExecuteInputField = 'payload' | 'settings' | 'mapping'

/**
 * Action is the beginning step for all partner actions. Entrypoints always start with the
 * MapAndValidateInput step.
 */
export class Action extends EventEmitter {
  steps: Steps
  requestExtensions: Extensions
  private autocompleteCache: { [key: string]: RequestFn }

  constructor() {
    super()

    this.steps = new Steps()
    const step = new MapInput()
    this.steps.push(step)

    this.requestExtensions = []
    this.autocompleteCache = {}
  }

  async execute(ctx: ExecuteInput): Promise<StepResult[]> {
    const results = await this.steps.execute(ctx)

    const finalResult = results[results.length - 1]
    if (finalResult.error) {
      throw finalResult.error
    }

    return results
  }

  validateSettings(schema: object): Action {
    const step = new Validate('Settings are invalid:', 'settings', schema)
    this.steps.push(step)
    return this
  }

  validatePayload(schema: object): Action {
    const step = new Validate('Payload is invalid:', 'payload', schema)
    this.steps.push(step)
    return this
  }

  autocomplete(field: string, callback: RequestFn): Action {
    this.autocompleteCache[field] = callback
    return this
  }

  executeAutocomplete(field: string, ctx: ExecuteAutocompleteInput): any {
    if (!this.autocompleteCache[field]) {
      return {
        data: [],
        pagination: {}
      }
    }

    const step = new Request(this.requestExtensions, this.autocompleteCache[field])

    return step.executeStep(ctx)
  }

  mapField(path: string, fieldMapping: FieldMapping): Action {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let pathParts: string[] = JSONPath.toPathArray(path)
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

    const step = new MapPayload(mapping, {
      merge: true
    })

    this.steps.push(step)

    return this
  }

  do(fn: Function): Action {
    const step = new Do(fn)
    this.steps.push(step)
    return this
  }

  fanOut(opts: FanOutOptions): FanOut {
    const step = new FanOut(this, opts)
    step.extendRequest(...this.requestExtensions)
    this.steps.push(step)
    return step
  }

  extendRequest(...extensionFns: Extensions): Action {
    this.requestExtensions.push(...extensionFns)
    return this
  }

  request(requestFn: RequestFn): Action {
    const step = new Request(this.requestExtensions, requestFn)

    step.on('response', response => this.emit('response', response))

    this.steps.push(step)

    return this
  }

  cachedRequest(config: CachedRequestConfig): Action {
    const step = new CachedRequest(this.requestExtensions, config)
    this.steps.push(step)
    return this
  }
}

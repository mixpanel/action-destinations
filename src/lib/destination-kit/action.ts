import { transform } from '../mapping-kit'
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

export type RequestFn<Settings, Payload> = (request: Got, data: ExecuteInput<Settings, Payload>) => any

export interface ActionDefinition<Settings, Payload = any> {
  /** The unique identifier for the action, e.g. `postToChannel` */
  // key: string
  /** The display title of the action */
  // this is in `schema` right now
  // title: string
  /** The display description of the action */
  // this is in `schema` right now
  // description: string
  /** The jsonschema representation of fields used to perform the action */
  schema: object
  /** The operation to perform when this action is triggered */
  perform: RequestFn<Settings, Payload>
}

class MapInput<Settings, Payload> extends Step<Settings, Payload> {
  executeStep(ctx: ExecuteInput<Settings, Payload>): Promise<string> {
    // Transforms the initial payload (event) + action settings (from `subscriptions[0].mapping`)
    // into input data that the action can use to talk to partner apis
    if (ctx.mapping) {
      ctx.payload = transform(ctx.mapping, ctx.payload)
    }

    return Promise.resolve('MapInput completed')
  }
}

export class Validate<Settings, Payload> extends Step<Settings, Payload> {
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

  executeStep(ctx: ExecuteInput<Settings, Payload>): Promise<string> {
    if (!this.validate(ctx[this.field])) {
      throw new AggregateAjvError(this.validate.errors)
    }

    return Promise.resolve('Validate completed')
  }
}

class MapPayload<Settings, Payload> extends Step<Settings, Payload> {
  mapping: JSONObject
  options: JSONObject

  constructor(mapping: JSONObject, options: JSONObject = {}) {
    super()
    this.mapping = mapping
    this.options = options
  }

  executeStep(ctx: ExecuteInput<Settings, Payload>): Promise<string> {
    ctx.payload = transform(this.mapping, ctx.payload, this.options)
    return Promise.resolve('MapPayload completed')
  }
}

export type Extension<Settings, Payload> = (ctx: ExecuteInput<Settings, Payload>) => ExtendOptions
export type Extensions<Settings, Payload> = Extension<Settings, Payload>[]

/**
 * Request handles delivering a payload to an external API. It uses the `got` library under the hood.
 *
 * The callback should be  able to return the raw request instead of needing to do `return response.data` etc.
 */
class Request<Settings, Payload> extends Step<Settings, Payload> {
  requestFn: RequestFn<Settings, Payload> | undefined
  extensions: Extensions<Settings, Payload>

  constructor(extensions: Extensions<Settings, Payload>, requestFn?: RequestFn<Settings, Payload>) {
    super()
    this.extensions = extensions || []
    this.requestFn = requestFn
  }

  async executeStep(ctx: ExecuteInput<Settings, Payload>): Promise<string> {
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

  baseRequest(ctx: ExecuteInput<Settings, Payload>): Got {
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

interface CachedRequestConfig<Settings, Payload> {
  key: (ctx: ExecuteInput<Settings, Payload>) => string
  value: RequestFn<Settings, Payload>
  as: string
  ttl: number
  negative?: boolean
}

// CachedRequest is like Request but cached. Next question.
class CachedRequest<Settings, Payload> extends Request<Settings, Payload> {
  keyFn: Function
  valueFn: Function
  as: string
  negative: boolean
  cache: NodeCache

  constructor(extensions: Extensions<Settings, Payload>, config: CachedRequestConfig<Settings, Payload>) {
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

  async executeStep(ctx: ExecuteInput<Settings, Payload>): Promise<string> {
    const k = this.keyFn(ctx)
    let v = this.cache.get<string>(k)

    if (v !== undefined) {
      ctx.cacheIds[this.as] = v
      return 'cache hit'
    }

    const request = this.baseRequest(ctx)

    try {
      v = await this.valueFn(request, ctx)
    } catch (e) {
      if (get(e, 'response.statusCode') === 404) {
        v = undefined
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

interface FanOutOptions {
  on: string
  as: string
}

/**
 * FanOut allows us to make multiple external requests in parallel based on a given array of values.
 */
class FanOut<Settings, Payload> extends Step<Settings, Payload> {
  parent: Action<Settings, Payload>
  steps: Steps<Settings, Payload>
  opts: FanOutOptions
  requestExtensions: Extensions<Settings, Payload>

  constructor(parent: Action<Settings, Payload>, opts: FanOutOptions) {
    super()
    this.parent = parent
    this.opts = opts
    this.steps = new Steps()
    this.requestExtensions = []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async executeStep(ctx: ExecuteInput<Settings, Payload>): Promise<any> {
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
  _on(on: string, ctx: ExecuteInput<Settings, Payload>): any {
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
  async executeForValue(ctx: ExecuteInput<Settings, Payload>, key: string, value: any): Promise<any> {
    // TODO handle ctx better, maybe propagate manually
    const ctxWithValue = {
      ...ctx,
      [key]: value
    }

    return await this.steps.execute(ctxWithValue)
  }

  // --

  cachedRequest(config: CachedRequestConfig<Settings, Payload>): FanOut<Settings, Payload> {
    const step = new CachedRequest([], config)
    this.steps.push(step)
    return this
  }

  extendRequest(...fns: Extensions<Settings, Payload>): FanOut<Settings, Payload> {
    this.requestExtensions.push(...fns)
    return this
  }

  request(fn: RequestFn<Settings, Payload>): FanOut<Settings, Payload> {
    const step = new Request([], fn)
    this.steps.push(step)
    return this
  }

  fanIn(): Action<Settings, Payload> {
    return this.parent
  }
}

interface ExecuteAutocompleteInput<Settings, Payload> {
  settings: Settings
  payload: Payload
  cacheIds: { [key: string]: string }
  page?: string
}

type ExecuteInputField = 'payload' | 'settings' | 'mapping'

// Type that makes a specific set of keys optional in a record
type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T
}

/**
 * Action is the beginning step for all partner actions. Entrypoints always start with the
 * MapAndValidateInput step.
 */
export class Action<Settings, Payload> extends EventEmitter {
  steps: Steps<Settings, Payload>
  requestExtensions: Extensions<Settings, Payload>
  private autocompleteCache: { [key: string]: RequestFn<Settings, Payload> }

  constructor() {
    super()

    this.steps = new Steps()
    const step = new MapInput<Settings, Payload>()
    this.steps.push(step)

    this.requestExtensions = []
    this.autocompleteCache = {}
  }

  async execute(ctx: ExecuteInput<Settings, Payload>): Promise<StepResult[]> {
    const results = await this.steps.execute(ctx)

    const finalResult = results[results.length - 1]
    if (finalResult.error) {
      throw finalResult.error
    }

    return results
  }

  validatePayload(schema: object): Action<Settings, Payload> {
    const step = new Validate('Payload is invalid:', 'payload', schema)
    this.steps.push(step)
    return this
  }

  autocomplete(field: string, callback: RequestFn<Settings, Payload>): Action<Settings, Payload> {
    this.autocompleteCache[field] = callback
    return this
  }

  executeAutocomplete(field: string, ctx: ExecuteAutocompleteInput<Settings, Payload>): any {
    if (!this.autocompleteCache[field]) {
      return {
        data: [],
        pagination: {}
      }
    }

    const step = new Request<Settings, Payload>(this.requestExtensions, this.autocompleteCache[field])

    return step.executeStep(ctx)
  }

  mapFields(mapping: PartialRecord<keyof Payload, JSONObject>): Action<Settings, Payload> {
    const mappingIfExists: Record<string, JSONObject> = {}

    // Wrap each mapping with an if statement to only apply it when the property exists
    for (const key of Object.keys(mapping)) {
      const originalMapping = mapping[key as keyof Payload] as JSONObject
      mappingIfExists[key] = {
        '@if': {
          exists: { '@path': `$.${key}` },
          then: originalMapping
        }
      }
    }

    const step = new MapPayload(mappingIfExists, { merge: true })
    this.steps.push(step)
    return this
  }

  fanOut(opts: FanOutOptions): FanOut<Settings, Payload> {
    const step = new FanOut<Settings, Payload>(this, opts)
    step.extendRequest(...this.requestExtensions)
    this.steps.push(step)
    return step
  }

  extendRequest(...extensionFns: Extensions<Settings, Payload>): Action<Settings, Payload> {
    this.requestExtensions.push(...extensionFns)
    return this
  }

  request(requestFn: RequestFn<Settings, Payload>): Action<Settings, Payload> {
    const step = new Request<Settings, Payload>(this.requestExtensions, requestFn)

    step.on('response', response => this.emit('response', response))

    this.steps.push(step)

    return this
  }

  cachedRequest(config: CachedRequestConfig<Settings, Payload>): Action<Settings, Payload> {
    const step = new CachedRequest(this.requestExtensions, config)
    this.steps.push(step)
    return this
  }
}

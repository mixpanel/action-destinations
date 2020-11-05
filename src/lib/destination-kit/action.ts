import { transform } from '../mapping-kit'
import Ajv from 'ajv'
import { AggregateAjvError } from '@segment/ajv-human-errors'
import got, { ExtendOptions, Got, Response } from 'got'
import NodeCache from 'node-cache'
import { EventEmitter } from 'events'
import get from 'lodash/get'
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

  /**
   * The jsonschema representation of fields used to perform the action
   *
   * We may eventually auto-generate the jsonschema from a definition object
   * instead of requiring devs to build and modify jsonschema directly.
   *
   * Plus, jsonschema cannot fully represent our action or field definitions
   * without many custom keywords.
   */
  schema: {
    title: string
    description: string
    type: string
    additionalProperties: boolean
    properties: Record<keyof Payload, Record<string, unknown>>
    required?: string[]
  }

  /**
   * Temporary way to "register" autocomplete fields.
   * This is likely going to change as we productionalize the data model and definition object
   */
  autocompleteFields?: {
    [K in keyof Payload]?: RequestFn<Settings, Payload>
  }

  /**
   * Register fields that should be executed, cached and provided
   * to the action's `perform` function
   */
  cachedFields?: {
    [field: string]: {
      key: (ctx: ExecuteInput<Settings, Payload>) => string
      ttl: number
      value: RequestFn<Settings, Payload>
      negative?: boolean
    }
  }

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

interface ExecuteAutocompleteInput<Settings, Payload> {
  settings: Settings
  payload: Payload
  cacheIds: { [key: string]: string }
  page?: string
}

type ExecuteInputField = 'payload' | 'settings' | 'mapping'

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

  loadDefinition(definition: ActionDefinition<Settings, Payload>): Action<Settings, Payload> {
    if (definition.schema) {
      this.validatePayload(definition.schema)
    }

    Object.entries(definition.autocompleteFields ?? {}).forEach(([field, callback]) => {
      this.autocomplete(field, callback as RequestFn<Settings, Payload>)
    })

    Object.entries(definition.cachedFields ?? {}).forEach(([field, cacheConfig]) => {
      this.cachedRequest({
        ...cacheConfig,
        as: field
      })
    })

    if (definition.perform) {
      this.request(definition.perform)
    }

    return this
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

// @ts-ignore no types
import { AggregateAjvError } from '@segment/ajv-human-errors'
import Ajv from 'ajv'
import { EventEmitter } from 'events'
import { Got, Response } from 'got'
import get from 'lodash/get'
import NodeCache from 'node-cache'
import createRequestClient from '../create-request-client'
import { JSONLikeObject } from '../json-object'
import { transform } from '../mapping-kit'
import { ExecuteInput, Step, StepResult, Steps } from './step'
import type { RequestExtension, RequestExtensions } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RequestFn<Settings, Payload> = (request: Got, data: ExecuteInput<Settings, Payload>) => any

export interface ActionSchema<Payload> {
  $schema: string
  type: string
  additionalProperties: boolean
  properties: Record<keyof Payload, Record<string, unknown>>
  defaultSubscription?: string
  required?: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ActionDefinition<Settings, Payload = any> {
  /** The unique identifier for the action, e.g. `postToChannel` */
  // key: string

  /** The display title of the action */
  title: string

  /** The display description of the action */
  description: string

  /**
   * The jsonschema representation of fields used to perform the action
   *
   * We may eventually auto-generate the jsonschema from a definition object
   * instead of requiring devs to build and modify jsonschema directly.
   *
   * Plus, jsonschema cannot fully represent our action or field definitions
   * without many custom keywords.
   */
  schema: ActionSchema<Payload>

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
      key: (data: ExecuteInput<Settings, Payload>) => string
      ttl: number
      value: RequestFn<Settings, Payload>
      negative?: boolean
    }
  }

  /** The operation to perform when this action is triggered */
  perform: RequestFn<Settings, Payload>
}

class MapInput<Settings, Payload extends JSONLikeObject> extends Step<Settings, Payload> {
  executeStep(data: ExecuteInput<Settings, Payload>): Promise<string> {
    // Transforms the initial payload (event) + action settings (from `subscriptions[0].mapping`)
    // into input data that the action can use to talk to partner apis
    if (data.mapping) {
      // Technically we can't know whether or not `transform` returns the exact shape of Payload here, hence the casting
      // It will be validated in subsequent steps
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.payload = transform(data.mapping, data.payload as any) as Payload
    }

    return Promise.resolve('MapInput completed')
  }
}

export class Validate<Settings, Payload> extends Step<Settings, Payload> {
  field: ExecuteInputField
  validate: Ajv.ValidateFunction

  constructor(field: ExecuteInputField, schema: object) {
    super()

    this.field = field

    const ajv = new Ajv({
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

  executeStep(data: ExecuteInput<Settings, Payload>): Promise<string> {
    if (!this.validate(data[this.field])) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      throw new AggregateAjvError(this.validate.errors)
    }

    return Promise.resolve('Validate completed')
  }
}

/**
 * Request handles delivering a payload to an external API. It uses the `got` library under the hood.
 *
 * The callback should be  able to return the raw request instead of needing to do `return response.data` etc.
 */
class Request<Settings, Payload> extends Step<Settings, Payload> {
  requestFn: RequestFn<Settings, Payload> | undefined
  // TODO change this to single extension? we never pass more than 1
  extensions: RequestExtensions<Settings, Payload>

  constructor(extensions: RequestExtensions<Settings, Payload>, requestFn?: RequestFn<Settings, Payload>) {
    super()
    this.extensions = extensions || []
    this.requestFn = requestFn
  }

  async executeStep(data: ExecuteInput<Settings, Payload>): Promise<string> {
    if (!this.requestFn) {
      return ''
    }

    const request = this.createRequestClient(data)

    let response: Response | JSONLikeObject | null
    try {
      response = await this.requestFn(request, data)
      this.emit('response', response)
    } catch (e) {
      if (e.response) {
        this.emit('response', e.response)
      }
      throw e
    }

    if (response === null) {
      return 'TODO: null'
    }

    return response.body as string
  }

  protected createRequestClient(data: ExecuteInput<Settings, Payload>): Got {
    const options = this.extensions.map((extension) => extension(data))
    return createRequestClient(...options)
  }
}

interface CachedRequestConfig<Settings, Payload> {
  key: (data: ExecuteInput<Settings, Payload>) => string
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

  constructor(extensions: RequestExtensions<Settings, Payload>, config: CachedRequestConfig<Settings, Payload>) {
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

  async executeStep(data: ExecuteInput<Settings, Payload>): Promise<string> {
    const k = this.keyFn(data)
    let v = this.cache.get<string>(k)

    if (v !== undefined) {
      data.cachedFields[this.as] = v
      return 'cache hit'
    }

    const request = this.createRequestClient(data)

    try {
      v = await this.valueFn(request, data)
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
  cachedFields: { [key: string]: string }
  page?: string
}

type ExecuteInputField = 'payload' | 'settings'

/**
 * Action is the beginning step for all partner actions. Entrypoints always start with the
 * MapAndValidateInput step.
 */
export class Action<Settings, Payload extends JSONLikeObject> extends EventEmitter {
  readonly steps: Steps<Settings, Payload>
  private requestExtensions: RequestExtensions<Settings, Payload>
  private autocompleteCache: { [key: string]: RequestFn<Settings, Payload> }

  constructor(definition: ActionDefinition<Settings, Payload>, extendRequest?: RequestExtension<Settings, Payload>) {
    super()

    this.steps = new Steps()
    const step = new MapInput<Settings, Payload>()
    this.steps.push(step)

    this.autocompleteCache = {}
    this.requestExtensions = []

    if (extendRequest) {
      // This must come before we load the definition because
      // it instantiates "steps" with whatever request extensions
      // are defined at that moment in time
      this.requestExtensions.push(extendRequest)
    }

    this.loadDefinition(definition)
  }

  async execute(data: ExecuteInput<Settings, Payload>): Promise<StepResult[]> {
    const results = await this.steps.execute(data)

    const finalResult = results[results.length - 1]
    if (finalResult.error) {
      throw finalResult.error
    }

    return results
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executeAutocomplete(field: string, data: ExecuteAutocompleteInput<Settings, Payload>): any {
    if (!this.autocompleteCache[field]) {
      return {
        data: [],
        pagination: {}
      }
    }

    const step = new Request<Settings, Payload>(this.requestExtensions, this.autocompleteCache[field])

    return step.executeStep(data)
  }

  private loadDefinition(definition: ActionDefinition<Settings, Payload>): void {
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
  }

  private validatePayload(schema: object): void {
    const step = new Validate('payload', schema)
    this.steps.push(step)
  }

  private autocomplete(field: string, callback: RequestFn<Settings, Payload>): void {
    this.autocompleteCache[field] = callback
  }

  private request(requestFn: RequestFn<Settings, Payload>): void {
    const step = new Request<Settings, Payload>(this.requestExtensions, requestFn)
    step.on('response', (response) => this.emit('response', response))
    this.steps.push(step)
  }

  private cachedRequest(config: CachedRequestConfig<Settings, Payload>): void {
    const step = new CachedRequest(this.requestExtensions, config)
    this.steps.push(step)
  }
}

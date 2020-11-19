import { JSONPath } from 'jsonpath-plus'
import Mustache from 'mustache'
import { v4 as uuidv4 } from 'uuid'
import dayjs from '../dayjs'
import { JSONObject, JSONValue, JSONLike, JSONLikeObject } from '../json-object'
import { isDirective } from './is-directive'
import { realTypeOf, isObject, isString, isArray } from './real-type-of'
import { removeUndefined } from './remove-undefined'
import validate from './validate'

type Directive = (options: JSONValue, payload: JSONObject) => JSONLike
type StringDirective = (value: string, payload: JSONObject) => JSONLike

interface Directives {
  [directive: string]: Directive | undefined
}

const directives: Directives = {}
const directiveRegExp = /^@[a-z][a-zA-Z0-9]+$/

function registerDirective(name: string, fn: Directive): void {
  if (!directiveRegExp.exec(name)) {
    throw new Error(`"${name}" is an invalid directive name`)
  }

  directives[name] = fn
}

function registerStringDirective(name: string, fn: StringDirective): void {
  registerDirective(name, (value, payload) => {
    const str = resolve(value, payload)
    if (typeof str !== 'string') {
      throw new Error(`${name}: expected string, got ${realTypeOf(str)}`)
    }

    return fn(str, payload)
  })
}

function runDirective(obj: JSONObject, payload: JSONObject): JSONLike {
  const name = Object.keys(obj).find((key) => key.startsWith('@')) as string
  const directiveFn = directives[name]
  const value = obj[name]

  if (typeof directiveFn !== 'function') {
    throw new Error(`${name} is not a valid directive, got ${realTypeOf(directiveFn)}`)
  }

  return directiveFn(value, payload)
}

registerStringDirective('@base64', (str, _payload) => {
  return Buffer.from(str).toString('base64')
})

registerDirective('@if', (opts, payload) => {
  let condition = false

  if (!isObject(opts)) {
    throw new Error('@if requires an object with one of: "exists", "true"')
  }

  if (opts.exists !== undefined) {
    const value = resolve(opts.exists, payload)
    condition = value !== undefined && value !== null
  } else if (opts.true !== undefined) {
    const value = resolve(opts.true, payload)
    condition = value !== null && value !== undefined && value.toString().toLowerCase() === 'true'
  } else {
    throw new Error('@if requires one of: exists, true')
  }

  if (condition && opts.then !== undefined) {
    return resolve(opts.then, payload)
  } else if (!condition && opts.else) {
    return resolve(opts.else, payload)
  }
})

registerDirective('@json', (value, payload) => {
  return JSON.stringify(resolve(value, payload))
})

registerStringDirective('@lowercase', (str: string, _payload) => {
  return str.toLowerCase()
})

registerDirective('@merge', (arr, payload) => {
  if (!Array.isArray(arr)) {
    throw new Error(`@merge: expected array, got ${realTypeOf(arr)}`)
  }

  const objects = arr.map((v) => resolve(v, payload))
  return Object.assign({}, ...objects) as JSONObject
})

function resolveObjectAndFields(directive: string, opts: JSONValue, payload: JSONObject) {
  if (!isObject(opts)) {
    throw new Error(`${directive}: expected object, got ${realTypeOf(opts)}`)
  }

  const obj = resolve(opts.object, payload)
  if (!isObject(obj)) {
    throw new Error(`${directive}: expected object, got ${realTypeOf(obj)}`)
  }

  const fields = resolve(opts.fields, payload)
  if (!Array.isArray(fields)) {
    throw new Error(`${directive}: expected fields as array, got ${realTypeOf(fields)}`)
  }

  return [obj, fields as string[]] as const
}

registerDirective('@omit', (opts, payload) => {
  const [obj, fields] = resolveObjectAndFields('@omit', opts, payload)

  const clonedObj: JSONObject = JSON.parse(JSON.stringify(obj))
  fields.forEach((f) => delete clonedObj[f])

  return clonedObj
})

registerStringDirective('@path', (path, payload) => {
  const found: JSONLike[] = JSONPath({ path, json: payload })

  if (found.length > 1) {
    return found
  }

  return found[0]
})

registerDirective('@pick', (opts, payload) => {
  const [obj, fields] = resolveObjectAndFields('@pick', opts, payload)

  const clean: { [member: string]: JSONLike } = {}
  fields.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(obj, f)) {
      clean[f] = obj[f]
    }
  })

  return clean
})

registerDirective('@root', (_, payload) => payload)

registerStringDirective('@template', (template: string, payload) => {
  return Mustache.render(template, payload)
})

registerDirective('@timestamp', (opts, payload) => {
  if (!isObject(opts)) {
    throw new Error(`@timestamp: requires an object, got ${realTypeOf(opts)}`)
  }

  const ts = resolve(opts.timestamp, payload)
  if (!isString(ts)) {
    throw new Error(`@timestamp: timestamp must be a string, got ${realTypeOf(ts)}`)
  }

  const format = resolve(opts.format, payload)
  if (!isString(format)) {
    throw new Error(`@timestamp: format must be a string, got ${realTypeOf(format)}`)
  }

  const inputFormat = resolve(opts.inputFormat, payload)
  if (inputFormat !== undefined && !isString(inputFormat)) {
    throw new Error(`@timestamp: inputFormat must be a string, got ${realTypeOf(inputFormat)}`)
  }

  const dayjsTs = dayjs.utc(ts, inputFormat)

  if (format === 'json') {
    return dayjsTs.toJSON()
  }

  return dayjsTs.format(format)
})

registerDirective('@uuid', (_, _payload) => uuidv4())

/**
 * Resolves a mapping value/object by applying the input payload based on directives
 * *WARNING* This function mutates `mapping` when an object
 * @param mapping - the mapping directives or raw values to resolve
 * @param payload - the input data to apply to the mapping directives
 * @todo support arrays or array directives?
 */
function resolve(mapping: JSONLike, payload: JSONObject): JSONLike {
  if (!isObject(mapping) && !isArray(mapping)) {
    return mapping
  }

  if (isDirective(mapping)) {
    return runDirective(mapping, payload)
  }

  if (Array.isArray(mapping)) {
    return mapping.map((value) => resolve(value, payload))
  }

  for (const key of Object.keys(mapping)) {
    const value = mapping[key]
    mapping[key] = resolve(value, payload)
  }

  return mapping
}

/**
 * Validates and transforms a mapping by applying the input payload
 * based on the directives and raw values defined in the mapping object
 * @param mapping - the directives and raw values
 * @param payload - the input data to apply to directives
 */
export function transform(mapping: JSONLikeObject, payload: JSONObject = {}): JSONObject {
  const payloadType = realTypeOf(payload)
  if (payloadType !== 'object') {
    throw new Error(`payload must be an object, got ${payloadType}`)
  }

  // throws if the mapping config is invalid
  validate(mapping)

  let resolved = resolve(mapping, payload)
  resolved = removeUndefined(resolved)

  // Cast because we know there are no `undefined` values anymore
  return resolved as JSONObject
}

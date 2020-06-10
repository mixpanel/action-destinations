const handlebars = require('handlebars')
const moment = require('moment')
moment.suppressDeprecationWarnings = true
const lodash = require('lodash')
const { JSONPath } = require('jsonpath-plus')

const directives = {}

// JavaScript absolutely amazes me. We need this function instead of `typeof`
// because `typeof` makes absolutely no sense:
//
//   - typeof null == 'object'
//   - typeof [] == 'object'
//   - typeof NaN == 'number'
//
// Instead, with realTypeOf, we have slightly more logical behavior:
//
//   - realTypeOf(null) == 'null'
//   - realTypeOf([]) == 'array'
function realTypeOf (v) {
  return Object.prototype.toString.call(v)
    .match(/\s([a-zA-Z]+)/)[1]
    .toLowerCase()
}

function registerDirective (name, fn) {
  if (!name.match(/^@[a-z][a-zA-Z0-9]+$/)) throw new Error(`"${name}" is an invalid directive name`)
  directives[name] = fn
}

function registerStringDirective (name, fn) {
  registerDirective(name, (value, payload) => {
    const str = resolve(value, payload)
    const strType = realTypeOf(str)
    if (strType !== 'string') throw new Error(`${name}: expected string, got ${strType}`)

    return fn(str, payload)
  })
}

function runDirective (obj, payload) {
  const name = Object.keys(obj)[0]
  const fn = directives[name]
  const opts = obj[name]

  const fnType = realTypeOf(fn)
  if (fnType !== 'function') throw new Error(`${name} is not a valid directive, got ${fnType}`)

  return fn(opts, payload)
}

// --

registerStringDirective('@base64', (str, payload) => {
  return Buffer.from(str).toString('base64')
})

registerStringDirective('@handlebars', (template, payload) => {
  return handlebars.compile(template, {
    // Allow some optimizations because we don't offer helpers yet
    knownHelpersOnly: true,
    // Don't escape HTML stuff
    noEscape: true
  })(payload)
})

registerStringDirective('@lowercase', (str, payload) => {
  return str.toLowerCase()
})

registerDirective('@merge', (arr, payload) => {
  const arrType = realTypeOf(arr)
  if (arrType !== 'array') throw new Error(`@merge: expected array, got ${arrType}`)

  const objects = arr.map((v) => resolve(v, payload))
  return Object.assign({}, ...objects)
})

function resolveObjectAndFields (directive, opts, payload) {
  const obj = resolve(opts.object, payload)
  const objType = realTypeOf(obj)
  if (objType !== 'object') throw new Error(`${directive}: expected object, got ${objType}`)

  const fields = resolve(opts.fields, payload)
  const fieldsType = realTypeOf(fields)
  if (fieldsType !== 'array') throw new Error(`${directive}: expected fields as array, got ${fieldsType}`)

  return [obj, fields]
}

registerDirective('@omit', (opts, payload) => {
  const [obj, fields] = resolveObjectAndFields('@omit', opts, payload)

  const clonedObj = JSON.parse(JSON.stringify(obj))
  fields.forEach(f => delete clonedObj[f])

  return clonedObj
})

registerStringDirective('@path', (path, payload) => {
  const found = JSONPath({ path, json: payload })
  if (found.length > 1) return found
  else return found[0]
})

registerDirective('@pick', (opts, payload) => {
  const [obj, fields] = resolveObjectAndFields('@omit', opts, payload)

  const clean = {}
  fields.forEach(f => {
    if (Object.prototype.hasOwnProperty.call(obj, f)) {
      clean[f] = obj[f]
    }
  })

  return clean
})

registerDirective('@root', (_, payload) => payload)

registerDirective('@timestamp', (opts, payload) => {
  const ts = resolve(opts.timestamp, payload)
  const tsType = realTypeOf(ts)
  if (tsType !== 'string') throw new Error(`@timestamp: timestamp must be a string, got ${tsType}`)

  const format = resolve(opts.format, payload)
  const formatType = realTypeOf(format)
  if (formatType !== 'string') throw new Error(`@timestamp: format must be a string, got ${formatType}`)

  const inputFormat = resolve(opts.inputFormat, payload)
  const inputFormatType = realTypeOf(inputFormat)
  if (inputFormat !== undefined && inputFormatType !== 'string') throw new Error(`@timestamp: inputFormat must be a string, got ${inputFormat}`)

  const momentTs = moment.utc(ts, inputFormat)

  if (format === 'json') return momentTs.toJSON()
  else return momentTs.format(format)
})

const uuid = require('uuid')
registerDirective('@uuid', (_, payload) => uuid.v4())

// --

const Ajv = require('ajv')
const ajv = new Ajv()
const schema = require('./schema.json')

function validate (mapping) {
  ajv.validate(schema, mapping)
  if (ajv.errors) {
    throw new Error(`Mapping is invalid: ${ajv.errorsText()}`)
  }
}

function isDirective (obj) {
  if (realTypeOf(obj) !== 'object') return false
  const keys = Object.keys(obj)
  if (keys.length !== 1) return false
  return keys[0].charAt(0) === '@'
}

function resolve (mapping, payload) {
  // TODO this feels weird
  if (typeof mapping !== 'object') return mapping

  if (isDirective(mapping)) {
    return runDirective(mapping, payload)
  }

  for (const key of Object.keys(mapping)) {
    const value = mapping[key]

    if (typeof value === 'object') {
      mapping[key] = resolve(value, payload)
    }

    // TODO handle arrays // array directives
  }

  return mapping
}

module.exports = {
  validate: validate,
  map: (mapping, payload = {}, options = {}) => {
    const payloadType = realTypeOf(payload)
    if (payloadType !== 'object') throw new Error(`payload must be an object, got ${payloadType}`)

    const resolved = resolve(mapping, payload)

    if (options.merge) {
      return lodash.merge(payload, resolved)
    } else {
      return resolved
    }
  }
}

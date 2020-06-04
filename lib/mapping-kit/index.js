// {
//   // Simple 1-to-1 mapping
//   user_id: { '@field': 'userId' },

//   // Complex mapping:
//   custom_attributes: {
//     '@merge': [
//       {
//         // Use all but a couple fields from traits:
//         '@omit': {
//           // Drop nested objects/arrays, an Intercom-specific requirement
//           object: {
//             '@flatten': { value: { '@fql': 'traits' }, drop: true }
//           },
//           fields: ['name', 'email', 'company', 'companies']
//         }
//       },

//       // Then add in some context fields, only if present:
//       {
//         device_type: {
//           '@if': {
//             isTrue: { '@fql': "typeof(value) = 'string'" },
//             value: { '@fql': 'properties.deviceType' },
//             elseIf: {
//               isTrue: { '@fql': "typeof(value) = 'string'" },
//               value: { '@fql': 'context.device.type' }
//             }
//           }
//         }
//       },
//       {
//         device_manufacturer: {
//           '@if': {
//             isTrue: { '@fql': "typeof(value) = 'string'" },
//             value: { '@fql': 'context.device.manufacturer' }
//           }
//         }
//       }
//     ]
//   },

//   // Mix in transforms
//   remote_created_at: {
//     '@if': {
//       isTrue: { '@fql': 'traits.createdAt > 0' },
//       value: { '@asTimestamp': { '@fql': 'traits.createdAt' } }
//     }
//   },
//   last_request_at: {
//     '@if': {
//       isTrue: { '@fql': 'traits.createdAt > 0' },
//       value: { '@asTimestamp': { '@fql': 'timestamp' } }
//     }
//   }

//   // ...
// }

const handlebars = require('handlebars')
const moment = require('moment')
moment.suppressDeprecationWarnings = true
const _ = require('lodash')

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
//   - realTypeOf(null) == 'null'
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

registerStringDirective('@field', (field, payload) => {
  return safeGet(payload, field)
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

// --

// safeGet pulls a field out of a nested object using a dot-notation path. ex.
// safeGet({a: {b: 'cool'}}, 'a.b') === 'cool'
function safeGet (obj, path) {
  const pathType = realTypeOf(path)
  if (pathType !== 'string') throw new Error(`path must be a string but got ${pathType}`)

  // 'a.b\\.c.d' => ['a', 'b.c', 'd']
  const parts = path.split(/(?<!\\)\./)
    .map((s) => s.replace('\\.', '.'))

  let result = obj
  for (const part of parts) {
    result = (result || {})[part]
  }
  return result
}

const Ajv = require('ajv')
const ajv = new Ajv({
  // Fill in any missing values with the default values.
  useDefaults: true,
  // Coerce types (e.g. 123 => "123") to be a bit more flexible.
  coerceTypes: true
})
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

// TODO support arrays
module.exports = function (mapping, payload = {}, options = {}) {
  const payloadType = realTypeOf(payload)
  if (payloadType !== 'object') throw new Error(`payload must be an object, got ${payloadType}`)

  validate(mapping)

  const resolved = resolve(mapping, payload)
  if (options.merge) {
    return _.merge(payload, resolved)
  } else {
    return resolved
  }
}

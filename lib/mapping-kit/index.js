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

const Handlebars = require('handlebars')

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
  if (!name.match(/^@[a-zA-Z]+$/)) throw new Error(`"${name}" is an invalid directive name`)
  directives[name] = fn
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

registerDirective('@field', (field, payload) => {
  const fieldType = realTypeOf(field)
  if (fieldType !== 'string') throw new Error(`@field: expected field string, got ${fieldType}`)

  return safeGet(payload, field)
})

registerDirective('@handlebars', (template, payload) => {
  return Handlebars.compile(template, {
    // Allow some optimizations because we don't offer helpers yet
    knownHelpersOnly: true,
    // Don't escape HTML stuff
    noEscape: true
  })(payload)
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

// TODO support arrays
module.exports = function (mapping, payload) {
  const payloadType = realTypeOf(payload)
  if (payloadType !== 'object') throw new Error(`payload must be an object, got ${payloadType}`)

  validate(mapping)

  return resolve(mapping, payload)
}

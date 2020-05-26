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

function registerDirective (name, fn) {
  if (!name.match(/^@[a-zA-Z]+$/)) throw new Error(`"${name}" is an invalid directive name`)
  directives[name] = fn
}

function runDirective (obj, payload) {
  const name = Object.keys(obj)[0]
  const fn = directives[name]
  const opts = obj[name]

  if (typeof fn !== 'function') throw new Error(`${name} is not a valid directive`)

  return fn(opts, payload)
}

// --

registerDirective('@field', (field, payload) => {
  if (typeof field !== 'string') throw new Error(`@field: expected field string, got ${typeof field}`)
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

// --

// safeGet pulls a field out of a nested object using a dot-notation path. ex.
// safeGet({a: {b: 'cool'}}, 'a.b') === 'cool'
function safeGet (obj, path) {
  if (typeof path !== 'string') throw new Error(`path must be a string but got a ${typeof path}`)

  // 'a.b\\.c.d' => ['a', 'b.c', 'd']
  const parts = path.split(/(?<!\\)\./)
    .map((s) => s.replace('\\.', '.'))

  let result = obj
  for (const part of parts) {
    result = (result || {})[part]
  }
  return result
}

function validate (mapping) {
  if (Array.isArray(mapping)) throw new Error('mapping is an array but expected an object')
  if (typeof mapping !== 'object') throw new Error(`mapping is a ${typeof mapping} but expected an object`)

  const keys = Object.keys(mapping)
  const directiveKeys = keys.filter((k) => k.match(/^@/))

  if (directiveKeys.length > 0 && directiveKeys.length !== keys.length) {
    throw new Error('object must have either one directives or no directives; cannot mix them')
  }

  if (directiveKeys.length > 1) {
    throw new Error(`object can only have one directive, found ${directiveKeys.length} directives: ${directiveKeys.join(', ')}`)
  }

  for (const key of Object.keys(mapping)) {
    const value = mapping[key]
    if (typeof value === 'object' && !Array.isArray(value)) {
      validate(value)
    }
  }
}

function isDirective (obj) {
  if (typeof obj !== 'object') return false
  const keys = Object.keys(obj)
  if (keys.length !== 1) return false
  return keys[0].charAt(0) === '@'
}

function resolve (mapping, payload) {
  // TODO
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

module.exports = function (mapping, payload) {
  if (typeof payload !== 'object') throw new Error(`payload must be an object, got a ${typeof payload}`)
  if (Array.isArray(payload)) throw new Error('payload must be an object, got an array')

  validate(mapping)

  return resolve(mapping, payload)
}

module.exports = validate

class AggregateError extends Error {
  constructor(...errors) {
    super()
    this.name = 'AggregateError'
    this._errors = errors.flatMap(e => {
      if (e instanceof AggregateError) {
        return [...e]
      } else {
        return e
      }
    })
    this._refreshMessage()
  }

  push(e) {
    if (e instanceof AggregateError) {
      for (const err of e) this._errors.push(err)
    } else {
      this._errors.push(e)
    }
    this._refreshMessage()
  }

  get length() {
    return this._errors.length
  }

  *[Symbol.iterator]() {
    for (const err of this._errors) {
      yield err
    }
  }

  _refreshMessage() {
    this.message = this._errors.map(e => e.message).join(' ')
  }
}

class ValidationError extends Error {
  constructor(msg, stack = []) {
    super(`/${stack.join('/')} ${msg}.`)
    this.name = 'ValidationError'
  }
}

// -- validators

function validate(mapping, stack = []) {
  switch (realTypeOf(mapping)) {
    case 'directive':
      return validateDirective(mapping, stack)
    case 'object':
      return validateObject(mapping, stack)
    case 'array':
      return validateArray(mapping, stack)
    default:
      // All other types are valid "raw" mappings
      return null
  }
}

function validateDirective(obj, stack = []) {
  const type = realTypeOf(obj)

  // "allow" non-directive objects so that we can throw a more descriptive error below
  if (type !== 'directive' && type !== 'object') {
    throw new ValidationError(`should be a directive object but it is ${indefiniteArticle(type)} ${type}`, stack)
  }

  const keys = Object.keys(obj)
  const directiveKeys = keys.filter(key => key.startsWith('@'))

  if (directiveKeys.length > 1) {
    throw new ValidationError(`should only have one @-prefixed key but it has ${directiveKeys.length} keys`, stack)
  }

  // Check that there aren't other keys besides @directive or _metadata
  const otherKeys = keys.filter(key => !key.startsWith('@') && key !== '_metadata')

  if (otherKeys.length > 0) {
    throw new ValidationError(`should only have one @-prefixed key but it has ${keys.length} keys`, stack)
  }

  const directiveKey = directiveKeys[0]
  const fn = directives[directiveKey]

  if (typeof fn !== 'function') {
    throw new ValidationError(`has an invalid directive: ${directiveKey}`, stack)
  }

  fn(obj[directiveKey], stack)
}

function validateDirectiveOrRaw(v, stack = []) {
  const type = realTypeOf(v)

  switch (type) {
    case 'directive':
      return validateDirective(v, stack)
    case 'object':
    case 'array':
    case 'boolean':
    case 'string':
    case 'number':
    case 'null':
      return
    default:
      throw new ValidationError(
        `should be a mapping directive or a JSON value but it is ${indefiniteArticle(type)} ${type}`,
        stack
      )
  }
}

function validateDirectiveOrString(v, stack = []) {
  const type = realTypeOf(v)

  switch (type) {
    case 'directive':
      return validateDirective(v, stack)
    case 'string':
      return
    default:
      throw new ValidationError(
        `should be a string or a mapping directive but it is ${indefiniteArticle(type)} ${type}`,
        stack
      )
  }
}

function validateDirectiveOrObject(v, stack = []) {
  const type = realTypeOf(v)

  switch (type) {
    case 'directive':
      return validateDirective(v, stack)
    case 'object':
      return validateObject(v, stack)
    default:
      throw new ValidationError(
        `should be a mapping directive or an object but it is ${indefiniteArticle(type)} ${type}`,
        stack
      )
  }
}

function validateDirectiveOrArray(v, stack = []) {
  const type = realTypeOf(v)

  switch (type) {
    case 'directive':
      return validateDirective(v, stack)
    case 'array':
      return validateArray(v, stack)
    default:
      throw new ValidationError(
        `should be a mapping directive or an array but it is ${indefiniteArticle(type)} ${type}`,
        stack
      )
  }
}

function validateObject(obj, stack = []) {
  const type = realTypeOf(obj)

  if (type !== 'object') {
    throw new ValidationError(`should be an object but it is ${indefiniteArticle(type)} ${type}`, stack)
  }

  const keys = Object.keys(obj)

  const directiveKey = keys.find(k => k.charAt(0) === '@')
  if (directiveKey) {
    throw new ValidationError(
      `shouldn't have directive (@-prefixed) keys but it has ${JSON.stringify(directiveKey)}`,
      stack
    )
  }

  const err = new AggregateError()

  keys.forEach(k => {
    try {
      validate(obj[k], [...stack, k])
    } catch (e) {
      err.push(e)
    }
  })

  if (err.length) throw err
}

function validateObjectWithFields(obj, fields, stack) {
  validateObject(obj, stack)

  var err = new AggregateError()

  Object.entries(fields).forEach(([prop, { required, optional }]) => {
    try {
      if (required) {
        if (obj[prop] === undefined) {
          throw new ValidationError(`should have field ${JSON.stringify(prop)} but it doesn't`, stack)
        }
        required(obj[prop], [...stack, prop])
      } else if (optional) {
        if (obj[prop] !== undefined) {
          optional(obj[prop], [...stack, prop])
        }
      }
    } catch (e) {
      err.push(e)
    }
  })

  if (err.length) throw err
}

function validateArray(arr, stack = []) {
  const type = realTypeOf(arr)

  if (type !== 'array') {
    throw new ValidationError(`should be an array but it is ${indefiniteArticle(type)} ${type}`, stack)
  }
}

// -- directives

const directives = {}

function directive(names, fn) {
  if (!Array.isArray(names)) {
    names = [names]
  }
  names.forEach(name => {
    directives[name] = (v, stack = []) => {
      try {
        fn(v, [...stack, name])
      } catch (e) {
        if (e instanceof ValidationError || e instanceof AggregateError) throw e
        else throw new ValidationError(e.message, stack)
      }
    }
  })
}

directive('@base64', (v, stack) => {
  validateDirectiveOrString(v, stack)
})

directive('@if', (v, stack) => {
  validateObjectWithFields(
    v,
    {
      exists: { optional: validateDirectiveOrRaw },
      true: { optional: validateDirectiveOrRaw },
      then: { optional: validateDirectiveOrRaw },
      else: { optional: validateDirectiveOrRaw }
    },
    stack
  )
})

directive('@json', (v, stack) => {
  validateDirectiveOrRaw(v, stack)
})

directive('@lowercase', (v, stack) => {
  validateDirectiveOrString(v, stack)
})

directive('@merge', (v, stack) => {
  validateArray(v, stack)

  const err = new AggregateError()
  v.forEach((obj, i) => {
    try {
      validateDirectiveOrObject(obj, [...stack, `${i}`])
    } catch (e) {
      err.push(e)
    }
  })
  if (err.length) throw err
})

directive(['@omit', '@pick'], (v, stack) => {
  validateObjectWithFields(
    v,
    {
      object: { required: validateDirectiveOrObject },
      fields: { required: validateDirectiveOrArray }
    },
    stack
  )

  if (realTypeOf(v.fields) === 'array') {
    const err = new AggregateError()

    v.fields.forEach((field, i) => {
      try {
        validateDirectiveOrString(field, [...stack, i.toString()])
      } catch (e) {
        err.push(e)
      }
    })

    if (err.length) throw err
  }
})

directive('@path', (v, stack) => {
  validateDirectiveOrString(v, stack)
})

directive('@root', v => {
  // no-op
})

directive('@template', (v, stack) => {
  validateDirectiveOrString(v, stack)
})

directive('@timestamp', (v, stack) => {
  validateObjectWithFields(
    v,
    {
      format: { required: validateDirectiveOrString },
      inputFormat: { optional: validateDirectiveOrString },
      timestamp: { required: validateDirectiveOrString }
    },
    stack
  )
})

directive('@uuid', v => {
  // no-op
})

directive('@cast', (v, stack) => {
  validateObjectWithFields(
    v,
    {
      value: { required: validateDirectiveOrString }
    },
    stack
  )
})

// -- util

function realTypeOf(v) {
  const rawType = typeof v

  if (rawType === 'object') {
    if (Array.isArray(v)) return 'array'
    else if (v === null) return 'null'
    else if (Object.keys(v).some(k => k.match(/^@/))) return 'directive'
    else return 'object'
  }

  return rawType
}

function indefiniteArticle(s) {
  switch (s.charAt(0)) {
    case 'a':
    case 'e':
    case 'i':
    case 'o':
    case 'u':
      return 'an'
    default:
      return 'a'
  }
}

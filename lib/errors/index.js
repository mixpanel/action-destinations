const {
  capitalize,
  pluralize,
  jsonPath,
  humanizePath,
  humanizeTypeOf,
  indefiniteArticle,
  humanizeList
} = require('./utils')

// AjvValidationError translates Ajv validation errors into more human-readable errors. For best
// results, you should enable the following options in your Ajv instance:
//
// * allErrors
// * humanize
// * jsonPointers
//
// This object can be passed to JSON.stringify() for a fully-annotated error object. Keep in mind
// that the fully annotated error object includes the input data that failed validation, which can
// be sensitive. So don't log the full error object. Only the messages can be considered safe.
//
// The following features of JSON Schema are not implemented:
//
// * patternProperties
// * allOf
// * oneOf
// * complex nested array schemas
// * const
// * if/then/else
// * contentEncoding/contentMediaType
class AjvValidationError extends Error {
  constructor (ajvErrors) {
    super('')
    this.errors = ajvErrors.map(e => loadError(e)).filter(e => e !== null)
    this.message = this.messages.join(' ')
  }

  get messages () {
    return [...new Set(this.errors.map(e => e.message))]
  }

  toJSON () {
    return this.errors
  }
}

module.exports.AjvValidationError = AjvValidationError

// https://github.com/ajv-validator/ajv#validation-errors
function loadError (ajvErr) {
  const err = {
    path: jsonPath(ajvErr.dataPath),
    message: `${humanizePath(ajvErr.dataPath)} ${ajvErr.message}`,
    value: ajvErr.data
  }

  const messageBuilder = messageBuilders[ajvErr.keyword]
  if (typeof messageBuilder === 'function') {
    err.message = messageBuilder(ajvErr)
  }

  // TODO we need a better way of indicating that an error should be filtered out (e.g. sub-errors
  // for 'propertyNames' validations on object properties)
  if (err.message === null) return null

  err.message = capitalize(err.message) + '.'

  return err
}

const messageBuilders = {}

// -- base keywords

messageBuilders.enum = (err) => {
  const allowed = humanizeList(err.params.allowedValues.map(JSON.stringify), 'or')

  return `expected ${humanizePath(err.dataPath)} to be ${allowed}`
}

messageBuilders.type = (err) => {
  const expectType = humanizeList(err.params.type.split(','), 'or')
  const gotType = humanizeTypeOf(err.data)

  return `${humanizePath(err.dataPath)} should be ${indefiniteArticle(expectType)} ${expectType} but it was ${gotType}`
}

// -- strings

messageBuilders.minLength = (err) => {
  const limit = err.params.limit
  const charsLimit = pluralize('character', limit)
  const actual = err.data.length
  const charsActual = pluralize('character', actual)

  return `${humanizePath(err.dataPath)} should be ${limit} ${charsLimit} or more but it was ${actual} ${charsActual}`
}

messageBuilders.maxLength = (err) => {
  const limit = err.params.limit
  const charsLimit = pluralize('character', limit)
  const actual = err.data.length
  const charsActual = pluralize('character', actual)

  return `${humanizePath(err.dataPath)} should be ${limit} ${charsLimit} or fewer but it was ${actual} ${charsActual}`
}

messageBuilders.pattern = (err) => {
  if (err.schemaPath.endsWith('propertyNames/pattern')) return null

  const patternLabel = err.parentSchema.patternLabel

  if (patternLabel) {
    return `${humanizePath(err.dataPath)} should be ${patternLabel} but it was not`
  } else {
    return `${humanizePath(err.dataPath)} is an invalid string`
  }
}

const formatLabels = {
  'date-time': 'date and time',
  time: 'time',
  date: 'date',
  email: 'email address',
  hostname: 'hostname',
  ipv4: 'IPv4 address',
  ipv6: 'IPv6 address',
  uri: 'URI',
  'uri-reference': 'URI Reference',
  'uri-template': 'URI-template',
  'json-pointer': 'JSON Pointer',
  'relative-json-pointer': 'relative JSON Pointer',
  regex: 'regular expression'
}

messageBuilders.format = (err) => {
  const label = formatLabels[err.params.format] || err.params.format

  return `${humanizePath(err.dataPath)} should be a valid ${label} string but it was not`
}

// -- numbers

messageBuilders.multipleOf = (err) => {
  return `${humanizePath(err.dataPath)} should be a multiple of ${err.params.multipleOf}`
}

messageBuilders.minimum = (err) => {
  return `${humanizePath(err.dataPath)} should be equal to or greater than ${err.params.limit}`
}

messageBuilders.exclusiveMinimum = (err) => {
  return `${humanizePath(err.dataPath)} should be greater than ${err.params.limit}`
}

messageBuilders.maximum = (err) => {
  return `${humanizePath(err.dataPath)} should be equal to or less than ${err.params.limit}`
}

messageBuilders.exclusiveMaximum = (err) => {
  return `${humanizePath(err.dataPath)} should be less than ${err.params.limit}`
}

// -- objects

messageBuilders.additionalProperties = (err) => {
  const allowed = Object.keys(err.parentSchema.properties).join(', ')
  const found = err.params.additionalProperty

  return `${humanizePath(err.dataPath)} has an unexpected property, ${found}, which is not in the list of allowed properties (${allowed})`
}

messageBuilders.required = (err) => {
  const missingField = err.params.missingProperty

  return `${humanizePath(err.dataPath)} is missing the required field '${missingField}'`
}

messageBuilders.propertyNames = (err) => {
  return `${humanizePath(err.dataPath)} has an invalid property name ${JSON.stringify(err.params.propertyName)}`
}

messageBuilders.minProperties = (err) => {
  const expected = err.params.limit
  const actual = Object.keys(err.data).length
  return `${humanizePath(err.dataPath)} should have ${expected} or more properties but it has ${actual}`
}

messageBuilders.maxProperties = (err) => {
  const expected = err.params.limit
  const actual = Object.keys(err.data).length
  return `${humanizePath(err.dataPath)} should have ${expected} or fewer properties but it has ${actual}`
}

messageBuilders.dependencies = (err) => {
  const prop = err.params.property
  const missing = err.params.missingProperty

  return `${humanizePath(err.dataPath)} should have property ${missing} when ${prop} is present`
}

// -- arrays

messageBuilders.minItems = (err) => {
  const min = err.params.limit
  const actual = err.data.length
  return `${humanizePath(err.dataPath)} should have ${min} or more items but it has ${actual}`
}

messageBuilders.maxItems = (err) => {
  const max = err.params.limit
  const actual = err.data.length
  return `${humanizePath(err.dataPath)} should have ${max} or fewer items but it has ${actual}`
}

messageBuilders.uniqueItems = (err) => {
  const { i, j } = err.params
  return `${humanizePath(err.dataPath)} should be unique but elements ${j} and ${i} are the same`
}

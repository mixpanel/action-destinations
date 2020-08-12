const { AjvValidationError } = require('./index')

const Ajv = require('ajv')
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  jsonPointers: true
})

function error (schema, payload) {
  ajv.validate(schema, payload)
  return new AjvValidationError(ajv.errors)
}

describe('AjvValidationError', () => {
  describe('base keywords', () => {
    it('returns type errors', () => {
      expect(error(
        { type: 'object' },
        []
      ).messages).toStrictEqual([
        'The root value should be an object but it was an array.'
      ])

      expect(error(
        { type: 'object' },
        1
      ).messages).toStrictEqual([
        'The root value should be an object but it was a number.'
      ])

      expect(error(
        { type: 'number' },
        'oops'
      ).messages).toStrictEqual([
        'The root value should be a number but it was a string.'
      ])

      expect(error(
        { type: ['number', 'string'] },
        {}
      ).messages).toStrictEqual([
        'The root value should be a number or string but it was an object.'
      ])
    })

    it('returns nested errors', () => {
      expect(error(
        { properties: { foo: { properties: { bar: { type: 'string' } } } } },
        { foo: { bar: {} } }
      ).messages).toStrictEqual([
        'The value at $.foo.bar should be a string but it was an object.'
      ])
    })

    it('returns enum errors', () => {
      expect(error(
        { enum: ['foo', 'bar', 10] },
        {}
      ).messages).toStrictEqual([
        'Expected the root value to be "foo", "bar", or 10.'
      ])
    })
  })

  describe('strings', () => {
    it('returns format errors', () => {
      expect(error(
        { type: 'string', minLength: 10 },
        'oops'
      ).messages).toStrictEqual([
        'The root value should be 10 characters or more but it was 4 characters.'
      ])

      expect(error(
        { type: 'string', minLength: 1 },
        ''
      ).messages).toStrictEqual([
        'The root value should be 1 character or more but it was 0 characters.'
      ])

      expect(error(
        { type: 'string', maxLength: 3 },
        'oops'
      ).messages).toStrictEqual([
        'The root value should be 3 characters or fewer but it was 4 characters.'
      ])

      expect(error(
        { type: 'string', pattern: '^\\d+$' },
        'oops'
      ).messages).toStrictEqual([
        'The root value is an invalid string.'
      ])

      expect(error(
        { type: 'string', pattern: '^\\d+$', patternLabel: 'an integer string' },
        'oops'
      ).messages).toStrictEqual([
        'The root value should be an integer string but it was not.'
      ])

      const testcases = [
        { format: 'date-time', label: 'date and time', value: '' },
        { format: 'time', label: 'time', value: '' },
        { format: 'date', label: 'date', value: '' },
        { format: 'email', label: 'email address', value: '' },
        { format: 'hostname', label: 'hostname', value: '' },
        { format: 'ipv4', label: 'IPv4 address', value: '' },
        { format: 'ipv6', label: 'IPv6 address', value: '' },
        { format: 'uri', label: 'URI', value: '' },
        { format: 'regex', label: 'regular expression', value: '[' }
      ]

      testcases.forEach(testcase => {
        const { format, label, value } = testcase
        expect(error(
          { type: 'string', format },
          value
        ).messages).toStrictEqual([
        `The root value should be a valid ${label} string but it was not.`
        ])
      })
    })
  })

  describe('numbers', () => {
    it('returns multipleOf errors', () => {
      expect(error(
        { type: 'number', multipleOf: 10 },
        1
      ).messages).toStrictEqual([
        'The root value should be a multiple of 10.'
      ])
    })

    it('returns range errors', () => {
      expect(error(
        { type: 'number', minimum: 5 },
        1
      ).messages).toStrictEqual([
        'The root value should be equal to or greater than 5.'
      ])

      expect(error(
        { type: 'number', exclusiveMinimum: 5 },
        5
      ).messages).toStrictEqual([
        'The root value should be greater than 5.'
      ])

      expect(error(
        { type: 'number', maximum: 5 },
        10
      ).messages).toStrictEqual([
        'The root value should be equal to or less than 5.'
      ])

      expect(error(
        { type: 'number', exclusiveMaximum: 5 },
        5
      ).messages).toStrictEqual([
        'The root value should be less than 5.'
      ])
    })
  })

  describe('objects', () => {
    it('returns additionalProperty errors', () => {
      expect(error(
        { properties: { a: {}, d: {} }, additionalProperties: false },
        { a: 1, b: 2, c: 3 }
      ).messages).toStrictEqual([
        'The root value has an unexpected property, b, which is not in the list of allowed properties (a, d).',
        'The root value has an unexpected property, c, which is not in the list of allowed properties (a, d).'
      ])

      expect(error(
        { properties: { a: {} }, additionalProperties: { type: 'string' } },
        { a: 1, b: 2 }
      ).messages).toStrictEqual([
        'The value at $.b should be a string but it was a number.'
      ])
    })

    it('returns required errors', () => {
      expect(error(
        { required: ['foo'] },
        {}
      ).messages).toStrictEqual([
        "The root value is missing the required field 'foo'."
      ])

      expect(error(
        { required: ['foo', 'bar'] },
        {}
      ).messages).toStrictEqual([
        "The root value is missing the required field 'foo'.",
        "The root value is missing the required field 'bar'."
      ])
    })

    it('returns propertyNames errors', () => {
      expect(error(
        { type: 'object', propertyNames: { pattern: '^\\d+$' } },
        { oops: 1 }
      ).messages).toStrictEqual([
        'The root value has an invalid property name "oops".'
      ])
    })

    it('returns size errors', () => {
      expect(error(
        { type: 'object', minProperties: 5 },
        { a: 1 }
      ).messages).toStrictEqual([
        'The root value should have 5 or more properties but it has 1.'
      ])

      expect(error(
        { type: 'object', maxProperties: 2 },
        { a: 1, b: 2, c: 3 }
      ).messages).toStrictEqual([
        'The root value should have 2 or fewer properties but it has 3.'
      ])
    })

    it('returns dependency errors', () => {
      expect(error(
        { type: 'object', dependencies: { a: ['b', 'c'] } },
        { a: 1 }
      ).messages).toStrictEqual([
        'The root value should have property b when a is present.',
        'The root value should have property c when a is present.'
      ])
    })
  })

  describe('arrays', () => {
    it('returns items errors', () => {
      expect(error(
        { type: 'array', items: { type: 'number' } },
        ['x']
      ).messages).toStrictEqual([
        'The value at $[0] should be a number but it was a string.'
      ])

      expect(error(
        { properties: { nums: { type: 'array', items: { type: 'number' } } } },
        { nums: [0, 'x'] }
      ).messages).toStrictEqual([
        'The value at $.nums[1] should be a number but it was a string.'
      ])

      expect(error(
        { properties: { nums: { type: 'array', items: { enum: ['a'] } } } },
        { nums: [0, 'x'] }
      ).messages).toStrictEqual([
        'Expected the value at $.nums[0] to be "a".',
        'Expected the value at $.nums[1] to be "a".'
      ])

      expect(error(
        { properties: { tuple: { type: 'array', items: [{ type: 'string' }, { type: 'number' }] } } },
        { tuple: [0, 'x'] }
      ).messages).toStrictEqual([
        'The value at $.tuple[0] should be a string but it was a number.',
        'The value at $.tuple[1] should be a number but it was a string.'
      ])
    })

    it('returns length errors', () => {
      expect(error(
        { type: 'array', minItems: 1 },
        []
      ).messages).toStrictEqual([
        'The root value should have 1 or more items but it has 0.'
      ])

      expect(error(
        { type: 'array', maxItems: 1 },
        [0, 1, 2]
      ).messages).toStrictEqual([
        'The root value should have 1 or fewer items but it has 3.'
      ])
    })

    it('returns uniqueItems errors', () => {
      expect(error(
        { type: 'array', uniqueItems: true },
        [0, 1, 2, 0, 1]
      ).messages).toStrictEqual([
        'The root value should be unique but elements 1 and 4 are the same.'
      ])
    })
  })

  describe('toJSON', () => {
    expect(error(
      {
        type: 'object',
        properties: {
          arr: { type: 'array', uniqueItems: true }
        }
      },
      { arr: [0, 1, 2, 0, 1] }
    ).toJSON()).toStrictEqual([
      {
        message: 'The value at $.arr should be unique but elements 1 and 4 are the same.',
        path: '$.arr',
        value: [0, 1, 2, 0, 1]
      }
    ])
  })
})

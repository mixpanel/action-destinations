import { transform } from '../index'

describe('validations', () => {
  test('valid', () => {
    expect(() => {
      // @ts-expect-error unsupported, but doesn't throw
      transform(['cool'])
    }).not.toThrow()
    expect(() => {
      // @ts-expect-error unsupported, but doesn't throw
      transform(123)
    }).not.toThrow()
    expect(() => {
      transform({ foo: 'bar' })
    }).not.toThrow()
    expect(() => {
      // @ts-expect-error unsupported, but doesn't throw
      transform('neat')
    }).not.toThrow()
    expect(() => {
      transform({ '@path': '$.foo.bar' })
    }).not.toThrow()
    expect(() => {
      transform({ a: 1, b: { '@path': '$.foo.bar' } })
    }).not.toThrow()
  })

  test('invalid', () => {
    expect(() => {
      transform({ a: 1, '@field': '$.foo.bar' })
    }).toThrow()
    expect(() => {
      transform({ oops: { '@merge': [{}, 123] } })
    }).toThrow()
    // Further validation tests are in validate.test.js
  })
})

describe('payload validations', () => {
  test('invalid type', () => {
    expect(() => {
      // @ts-expect-error
      transform({ a: 1 }, 123)
    }).toThrowError()
    expect(() => {
      // @ts-expect-error
      transform({ a: 1 }, [])
    }).toThrowError()
  })
})

describe('no-op', () => {
  test('empty mapping', () => {
    const output = transform({}, { cool: false })
    expect(output).toStrictEqual({})
  })

  test('pass-through mapping', () => {
    const output = transform({ cool: true }, {})
    expect(output).toStrictEqual({ cool: true })
  })
})

describe('@base64', () => {
  const str = 'hello, world!'
  const base64Str = Buffer.from(str).toString('base64')

  test('simple', () => {
    const output = transform({ '@base64': str }, {})
    expect(output).toStrictEqual(base64Str)
  })

  test('nested directive', () => {
    const output = transform({ '@base64': { '@path': '$.foo' } }, { foo: str })
    expect(output).toStrictEqual(base64Str)
  })

  test('invalid type', () => {
    expect(() => {
      transform({ '@base64': { oops: true } }, {})
    }).toThrowError()
  })
})

describe('@if', () => {
  const payload = { a: 1, b: true, c: false, d: null }

  test('exists', () => {
    let output = transform(
      {
        '@if': {
          exists: { '@path': '$.a' },
          then: 1,
          else: 2
        }
      },
      payload
    )
    expect(output).toStrictEqual(1)

    output = transform(
      {
        '@if': {
          exists: { '@path': '$.d' },
          then: 1,
          else: 2
        }
      },
      payload
    )
    expect(output).toStrictEqual(2)

    output = transform(
      {
        '@if': {
          exists: { '@path': '$.x' },
          then: 1,
          else: 2
        }
      },
      payload
    )
    expect(output).toStrictEqual(2)
  })

  test('true', () => {
    let output = transform(
      {
        '@if': {
          true: { '@path': '$.b' },
          then: 1,
          else: 2
        }
      },
      payload
    )
    expect(output).toStrictEqual(1)

    output = transform(
      {
        '@if': {
          true: { '@path': '$.c' },
          then: 1,
          else: 2
        }
      },
      payload
    )
    expect(output).toStrictEqual(2)
  })
})

describe('@json', () => {
  test('simple', () => {
    expect(transform({ '@json': true }, {})).toStrictEqual('true')
    expect(transform({ '@json': {} }, {})).toStrictEqual('{}')
    expect(transform({ '@json': 'hello' }, {})).toStrictEqual('"hello"')
  })

  test('nested', () => {
    const output = transform({ '@json': { '@path': '$.properties.cool' } }, { properties: { cool: 'yep' } })
    expect(output).toStrictEqual('"yep"')
  })
})

describe('@lowercase', () => {
  const str = 'OMG123!'
  const lowerStr = 'omg123!'

  test('simple', () => {
    const output = transform({ '@lowercase': str }, {})
    expect(output).toStrictEqual(lowerStr)
  })

  test('nested directive', () => {
    const output = transform({ '@lowercase': { '@path': '$.foo' } }, { foo: str })
    expect(output).toStrictEqual(lowerStr)
  })

  test('invalid type', () => {
    expect(() => {
      transform({ '@lowercase': ['oh no'] }, {})
    }).toThrowError()
  })
})

describe('@merge', () => {
  test('empty', () => {
    const output = transform({ '@merge': [] }, {})
    expect(output).toStrictEqual({})
  })

  test('one object', () => {
    const output = transform({ '@merge': [{ cool: true }] }, {})
    expect(output).toStrictEqual({ cool: true })
  })

  test('simple overwrite', () => {
    const output = transform({ '@merge': [{ cool: true }, { cool: 'you bet' }] }, {})
    expect(output).toStrictEqual({ cool: 'you bet' })
  })

  test('nested directive', () => {
    const output = transform({ '@merge': [{ cool: true }, { '@path': '$.foo' }] }, { foo: { bar: 'baz' } })
    expect(output).toStrictEqual({ cool: true, bar: 'baz' })
  })
})

describe('@omit', () => {
  test('empty object', () => {
    const output = transform(
      {
        '@omit': {
          object: {},
          fields: ['a']
        }
      },
      {}
    )
    expect(output).toStrictEqual({})
  })

  test('empty fields', () => {
    const output = transform(
      {
        '@omit': {
          object: { a: 1 },
          fields: []
        }
      },
      {}
    )
    expect(output).toStrictEqual({ a: 1 })
  })

  test('raw object and fields', () => {
    const output = transform(
      {
        '@omit': {
          object: { a: 1, b: 2, c: 3 },
          fields: ['a', 'c']
        }
      },
      {}
    )
    expect(output).toStrictEqual({ b: 2 })
  })

  test('object directive', () => {
    const output = transform(
      {
        '@omit': {
          object: { '@path': '$.foo' },
          fields: ['a']
        }
      },
      { foo: { a: 1, b: 2 } }
    )
    expect(output).toStrictEqual({ b: 2 })
  })

  test('fields directive', () => {
    const output = transform(
      {
        '@omit': {
          object: { a: 1, b: 2, c: 3 },
          fields: { '@path': '$.foo' }
        }
      },
      { foo: ['a', 'c'] }
    )
    expect(output).toStrictEqual({ b: 2 })
  })

  test('fields nested directive', () => {
    const output = transform(
      {
        '@omit': {
          object: { a: 1, b: 2, c: 3 },
          fields: ['a', { '@path': '$.foo' }]
        }
      },
      { foo: 'c' }
    )
    expect(output).toStrictEqual({ b: 2 })
  })

  test("doesn't modify original", () => {
    const original = { a: 1, b: 2, c: 3 }
    const output = transform(
      {
        '@omit': {
          object: original,
          fields: ['a', 'b', 'c']
        }
      },
      {}
    )
    expect(output).toStrictEqual({})
    expect(original).toStrictEqual({ a: 1, b: 2, c: 3 })
  })
})

describe('@path', () => {
  test('simple', () => {
    const output = transform({ neat: { '@path': '$.foo' } }, { foo: 'bar' })
    expect(output).toStrictEqual({ neat: 'bar' })
  })

  test('nested path', () => {
    const output = transform({ neat: { '@path': '$.foo.bar' } }, { foo: { bar: 'baz' } })
    expect(output).toStrictEqual({ neat: 'baz' })
  })

  test('nested directive', () => {
    const output = transform({ '@path': { '@path': '$.foo' } }, { foo: 'bar', bar: 'baz' })
    expect(output).toStrictEqual('baz')
  })

  test('JSONPath features', () => {
    const output = transform({ '@path': '$.foo..bar' }, { foo: [{ bar: 1 }, { bar: 2 }] })
    expect(output).toStrictEqual([1, 2])
  })

  test('invalid path', () => {
    const output = transform({ neat: { '@path': '$.oops' } }, { foo: 'bar' })
    expect(output).toStrictEqual({})
  })

  test('invalid key type', () => {
    expect(() => {
      transform({ neat: { '@path': {} } }, { foo: 'bar' })
    }).toThrowError()
  })

  test('invalid nested value type', () => {
    const output = transform({ neat: { '@path': '$.foo.bar.baz' } }, { foo: 'bar' })
    expect(output).toStrictEqual({})
  })
})

describe('@pick', () => {
  test('empty object', () => {
    const output = transform(
      {
        '@pick': {
          object: {},
          fields: ['a']
        }
      },
      {}
    )
    expect(output).toStrictEqual({})
  })

  test('empty fields', () => {
    const output = transform(
      {
        '@pick': {
          object: { a: 1 },
          fields: []
        }
      },
      {}
    )
    expect(output).toStrictEqual({})
  })

  test('raw object and fields', () => {
    const output = transform(
      {
        '@pick': {
          object: { a: 1, b: 2, c: 3 },
          fields: ['a', 'c', 'd']
        }
      },
      {}
    )
    expect(output).toStrictEqual({ a: 1, c: 3 })
  })

  test('object directive', () => {
    const output = transform(
      {
        '@pick': {
          object: { '@path': '$.foo' },
          fields: ['a']
        }
      },
      { foo: { a: 1, b: 2 } }
    )
    expect(output).toStrictEqual({ a: 1 })
  })

  test('fields directive', () => {
    const output = transform(
      {
        '@pick': {
          object: { a: 1, b: 2, c: 3 },
          fields: { '@path': '$.foo' }
        }
      },
      { foo: ['a', 'c'] }
    )
    expect(output).toStrictEqual({ a: 1, c: 3 })
  })

  test('fields nested directive', () => {
    const output = transform(
      {
        '@pick': {
          object: { a: 1, b: 2, c: 3 },
          fields: ['a', { '@path': '$.foo' }]
        }
      },
      { foo: 'c' }
    )
    expect(output).toStrictEqual({ a: 1, c: 3 })
  })

  test("doesn't modify original", () => {
    const original = { a: 1, b: 2, c: 3 }
    const output = transform(
      {
        '@pick': {
          object: original,
          fields: ['a']
        }
      },
      {}
    )
    expect(output).toStrictEqual({ a: 1 })
    expect(original).toStrictEqual({ a: 1, b: 2, c: 3 })
  })
})

describe('@root', () => {
  test('simple', () => {
    const output = transform({ '@root': true }, { cool: true })
    expect(output).toStrictEqual({ cool: true })
  })
})

describe('@template', () => {
  test('basic', () => {
    const output = transform({ '@template': 'Hello, {{who}}!' }, { who: 'World' })
    expect(output).toStrictEqual('Hello, World!')
  })

  test('nested fields', () => {
    const output = transform({ '@template': 'Hello, {{who.name}}!' }, { who: { name: 'World' } })
    expect(output).toStrictEqual('Hello, World!')
  })

  test('no escaping', () => {
    const output = transform({ '@template': '<blink>{{a}} {{{a}}}</blink>' }, { a: '<b>Hi</b>' })
    expect(output).toStrictEqual('<blink>&lt;b&gt;Hi&lt;&#x2F;b&gt; <b>Hi</b></blink>')
  })

  test('missing fields', () => {
    const output = transform({ '@template': '{{oops.yo}}' }, {})
    expect(output).toStrictEqual('')
  })

  test('invalid template', () => {
    expect(() => {
      transform({ '@template': '{{' }, {})
    }).toThrowError()
  })
})

describe('@timestamp', () => {
  const ts = '2020-06-01'

  test('json format', () => {
    const output = transform(
      {
        '@timestamp': {
          timestamp: ts,
          format: 'json'
        }
      },
      {}
    )
    expect(output).toStrictEqual('2020-06-01T00:00:00.000Z')
  })

  test('custom format', () => {
    const output = transform(
      {
        '@timestamp': {
          timestamp: ts,
          format: 'DD MM YY'
        }
      },
      {}
    )
    expect(output).toStrictEqual('01 06 20')
  })

  test('nested directives', () => {
    const output = transform(
      {
        '@timestamp': {
          timestamp: { '@path': '$.timestamp' },
          format: { '@path': '$.format' }
        }
      },
      { timestamp: ts, format: 'DD MM YY' }
    )
    expect(output).toStrictEqual('01 06 20')
  })

  test('bad timestamp type', () => {
    expect(() => {
      transform(
        {
          '@timestamp': {
            timestamp: { '@path': '$.timestamp' },
            format: { '@path': '$.format' }
          }
        },
        { timestamp: ['oops'], format: 'DD MM YY' }
      )
    }).toThrowError()
  })

  test('bad format type', () => {
    expect(() => {
      transform(
        {
          '@timestamp': {
            timestamp: { '@path': '$.timestamp' },
            format: { '@path': '$.format' }
          }
        },
        { timestamp: ts, format: ['oops'] }
      )
    }).toThrowError()
  })

  test('bad input', () => {
    const output = transform(
      {
        '@timestamp': {
          timestamp: 'oops',
          format: 'json'
        }
      },
      {}
    )
    expect(output).toStrictEqual(null)
  })
})

describe('@uuid', () => {
  test('unique IDs', () => {
    const outputA = transform({ '@uuid': {} }, {})
    expect(outputA).toMatch(/^[a-f0-9-]{36}$/)

    const outputB = transform({ '@uuid': {} }, {})
    expect(outputA).not.toEqual(outputB)
  })
})

describe('remove undefined values in objects', () => {
  test('simple', () => {
    expect(transform({ x: undefined }, {})).toEqual({})
    expect(transform({ x: null }, {})).toEqual({ x: null })
    expect(transform({ x: 'hi' }, {})).toEqual({ x: 'hi' })
    expect(transform({ x: 1 }, {})).toEqual({ x: 1 })
    expect(transform({ x: {} }, {})).toEqual({ x: {} })
    expect(transform({ x: undefined, y: 1, z: 'hi' }, {})).toEqual({ y: 1, z: 'hi' })
  })

  test('nested', () => {
    expect(transform({ x: { y: undefined, z: 1 }, foo: 1 }, {})).toEqual({
      x: { z: 1 },
      foo: 1
    })
    expect(transform({ x: { y: { z: undefined } }, foo: 1 }, {})).toEqual({
      x: { y: {} },
      foo: 1
    })
  })
})

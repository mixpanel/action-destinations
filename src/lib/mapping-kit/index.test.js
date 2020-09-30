const { map } = require('./index')

describe('validations', () => {
  test('valid', () => {
    expect(() => {
      map(['cool'])
    }).not.toThrow()
    expect(() => {
      map(123)
    }).not.toThrow()
    expect(() => {
      map({ foo: 'bar' })
    }).not.toThrow()
    expect(() => {
      map('neat')
    }).not.toThrow()
    expect(() => {
      map({ '@path': '$.foo.bar' })
    }).not.toThrow()
    expect(() => {
      map({ a: 1, b: { '@path': '$.foo.bar' } })
    }).not.toThrow()
  })

  test('invalid', () => {
    expect(() => {
      map({ a: 1, '@field': '$.foo.bar' })
    }).toThrow()
    expect(() => {
      map({ oops: { '@merge': [{}, 123] } })
    }).toThrow()
    // Further validaiton tests are in validate.test.js
  })
})

describe('payload validations', () => {
  test('invalid type', () => {
    expect(() => {
      map({ a: 1 }, 123)
    }).toThrowError()
    expect(() => {
      map({ a: 1 }, [])
    }).toThrowError()
  })
})

describe('no-op', () => {
  test('empty mapping', () => {
    const output = map({}, { cool: false })
    expect(output).toStrictEqual({})
  })

  test('pass-through mapping', () => {
    const output = map({ cool: true }, {})
    expect(output).toStrictEqual({ cool: true })
  })
})

describe('options', () => {
  describe('merge', () => {
    test('overwrite value', () => {
      const output = map(
        { a: { b: 0 } }, // mapping
        { a: { b: { c: 1 } } }, // payload
        { merge: true } // options
      )
      expect(output).toStrictEqual({ a: { b: 0 } })
    })

    test('leave other values intact', () => {
      const output = map(
        { a: { b: 0 }, d: 1 }, // mapping
        { a: { b: 2, c: 3 }, e: 4 }, // payload
        { merge: true } // options
      )
      expect(output).toStrictEqual({ a: { b: 0, c: 3 }, d: 1, e: 4 })
    })
  })
})

describe('@base64', () => {
  const str = 'hello, world!'
  const base64Str = Buffer.from(str).toString('base64')

  test('simple', () => {
    const output = map({ '@base64': str }, {})
    expect(output).toStrictEqual(base64Str)
  })

  test('nested directive', () => {
    const output = map({ '@base64': { '@path': '$.foo' } }, { foo: str })
    expect(output).toStrictEqual(base64Str)
  })

  test('invalid type', () => {
    expect(() => {
      map({ '@base64': { oops: true } }, {})
    }).toThrowError()
  })
})

describe('@if', () => {
  const payload = { a: 1, b: true, c: false, d: null }

  test('exists', () => {
    let output = map(
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

    output = map(
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

    output = map(
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
    let output = map(
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

    output = map(
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
    expect(map({ '@json': true }, {})).toStrictEqual('true')
    expect(map({ '@json': {} }, {})).toStrictEqual('{}')
    expect(map({ '@json': 'hello' }, {})).toStrictEqual('"hello"')
  })

  test('nested', () => {
    const output = map(
      { '@json': { '@path': '$.properties.cool' } },
      { properties: { cool: 'yep' } }
    )
    expect(output).toStrictEqual('"yep"')
  })
})

describe('@lowercase', () => {
  const str = 'OMG123!'
  const lowerStr = 'omg123!'

  test('simple', () => {
    const output = map({ '@lowercase': str }, {})
    expect(output).toStrictEqual(lowerStr)
  })

  test('nested directive', () => {
    const output = map({ '@lowercase': { '@path': '$.foo' } }, { foo: str })
    expect(output).toStrictEqual(lowerStr)
  })

  test('invalid type', () => {
    expect(() => {
      map({ '@lowercase': ['oh no'] }, {})
    }).toThrowError()
  })
})

describe('@merge', () => {
  test('empty', () => {
    const output = map({ '@merge': [] }, {})
    expect(output).toStrictEqual({})
  })

  test('one object', () => {
    const output = map({ '@merge': [{ cool: true }] }, {})
    expect(output).toStrictEqual({ cool: true })
  })

  test('simple overwrite', () => {
    const output = map({ '@merge': [{ cool: true }, { cool: 'you bet' }] }, {})
    expect(output).toStrictEqual({ cool: 'you bet' })
  })

  test('nested directive', () => {
    const output = map(
      { '@merge': [{ cool: true }, { '@path': '$.foo' }] },
      { foo: { bar: 'baz' } }
    )
    expect(output).toStrictEqual({ cool: true, bar: 'baz' })
  })
})

describe('@omit', () => {
  test('empty object', () => {
    const output = map(
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
    const output = map(
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
    const output = map(
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
    const output = map(
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
    const output = map(
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
    const output = map(
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
    const output = map(
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
    const output = map({ neat: { '@path': '$.foo' } }, { foo: 'bar' })
    expect(output).toStrictEqual({ neat: 'bar' })
  })

  test('nested path', () => {
    const output = map(
      { neat: { '@path': '$.foo.bar' } },
      { foo: { bar: 'baz' } }
    )
    expect(output).toStrictEqual({ neat: 'baz' })
  })

  test('nested directive', () => {
    const output = map(
      { '@path': { '@path': '$.foo' } },
      { foo: 'bar', bar: 'baz' }
    )
    expect(output).toStrictEqual('baz')
  })

  test('JSONPath features', () => {
    const output = map(
      { '@path': '$.foo..bar' },
      { foo: [{ bar: 1 }, { bar: 2 }] }
    )
    expect(output).toStrictEqual([1, 2])
  })

  test('invalid path', () => {
    const output = map({ neat: { '@path': '$.oops' } }, { foo: 'bar' })
    expect(output).toStrictEqual({})
  })

  test('invalid key type', () => {
    expect(() => {
      map({ neat: { '@path': {} } }, { foo: 'bar' })
    }).toThrowError()
  })

  test('invalid nested value type', () => {
    const output = map({ neat: { '@path': '$.foo.bar.baz' } }, { foo: 'bar' })
    expect(output).toStrictEqual({})
  })
})

describe('@pick', () => {
  test('empty object', () => {
    const output = map(
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
    const output = map(
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
    const output = map(
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
    const output = map(
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
    const output = map(
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
    const output = map(
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
    const output = map(
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
    const output = map({ '@root': true }, { cool: true })
    expect(output).toStrictEqual({ cool: true })
  })
})

describe('@template', () => {
  test('basic', () => {
    const output = map({ '@template': 'Hello, {{who}}!' }, { who: 'World' })
    expect(output).toStrictEqual('Hello, World!')
  })

  test('nested fields', () => {
    const output = map(
      { '@template': 'Hello, {{who.name}}!' },
      { who: { name: 'World' } }
    )
    expect(output).toStrictEqual('Hello, World!')
  })

  test('no escaping', () => {
    const output = map(
      { '@template': '<blink>{{a}} {{{a}}}</blink>' },
      { a: '<b>Hi</b>' }
    )
    expect(output).toStrictEqual(
      '<blink>&lt;b&gt;Hi&lt;&#x2F;b&gt; <b>Hi</b></blink>'
    )
  })

  test('missing fields', () => {
    const output = map({ '@template': '{{oops.yo}}' }, {})
    expect(output).toStrictEqual('')
  })

  test('invalid template', () => {
    expect(() => {
      map({ '@template': '{{' }, {})
    }).toThrowError()
  })
})

describe('@timestamp', () => {
  const ts = '2020-06-01'

  test('json format', () => {
    const output = map(
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
    const output = map(
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
    const output = map(
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
      map(
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
      map(
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
    const output = map(
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
    const outputA = map({ '@uuid': {} }, {})
    expect(outputA).toMatch(/^[a-f0-9-]{36}$/)

    const outputB = map({ '@uuid': {} }, {})
    expect(outputA).not.toEqual(outputB)
  })
})

describe('@cast', () => {
  test('string to number', () => {
    const output = map(
      {
        '@cast': {
          value: '123',
          to: 'number'
        }
      },
      {}
    )

    expect(output).toEqual(123)
  })

  test('number to string', () => {
    const output = map(
      {
        '@cast': {
          value: { '@path': '$.value' },
          to: 'string'
        }
      },
      {
        value: 123
      }
    )

    expect(output).toEqual('123')
  })
})

describe('remove undefined values in objects', () => {
  test('simple', () => {
    expect(map({ x: undefined }, {})).toEqual({})
    expect(map({ x: null }, {})).toEqual({ x: null })
    expect(map({ x: 'hi' }, {})).toEqual({ x: 'hi' })
    expect(map({ x: 1 }, {})).toEqual({ x: 1 })
    expect(map({ x: {} }, {})).toEqual({ x: {} })
    expect(map({ x: undefined, y: 1, z: 'hi' }, {})).toEqual({ y: 1, z: 'hi' })
  })

  test('nested', () => {
    expect(map({ x: { y: undefined, z: 1 }, foo: 1 }, {})).toEqual({
      x: { z: 1 },
      foo: 1
    })
    expect(map({ x: { y: { z: undefined } }, foo: 1 }, {})).toEqual({
      x: { y: {} },
      foo: 1
    })
  })
})

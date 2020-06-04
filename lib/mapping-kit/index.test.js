const map = require('./index')

describe('mapping validations', () => {
  test('mixed keys', () => {
    expect(() => {
      map({ foo: 1, '@field': 2 }, {})
    }).toThrowError()
  })

  test('nested mixed keys', () => {
    expect(() => {
      map({ foo: { bar: 1, '@field': 2 } }, {})
    }).toThrowError()
  })

  test('multiple directives', () => {
    expect(() => {
      map({ '@field': '', '@handlebars': '' }, {})
    }).toThrowError()
  })
})

describe('payload validations', () => {
  test('invalid type', () => {
    expect(() => { map({ a: 1 }, 123) }).toThrowError()
    expect(() => { map({ a: 1 }, []) }).toThrowError()
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

describe('@base64', () => {
  const str = 'hello, world!'
  const base64Str = Buffer.from(str).toString('base64')

  test('simple', () => {
    const output = map({ '@base64': str }, {})
    expect(output).toStrictEqual(base64Str)
  })

  test('nested directive', () => {
    const output = map({ '@base64': { '@field': 'foo' } }, { foo: str })
    expect(output).toStrictEqual(base64Str)
  })

  test('invalid type', () => {
    expect(() => {
      map({ '@base64': { oops: true } }, {})
    }).toThrowError()
  })
})

describe('@field', () => {
  test('simple', () => {
    const output = map({ neat: { '@field': 'foo' } }, { foo: 'bar' })
    expect(output).toStrictEqual({ neat: 'bar' })
  })

  test('nested path', () => {
    const output = map({ neat: { '@field': 'foo.bar' } }, { foo: { bar: 'baz' } })
    expect(output).toStrictEqual({ neat: 'baz' })
  })

  test('escaped nested path', () => {
    const output = map({ neat: { '@field': 'foo\\.bar.baz' } }, { 'foo.bar': { baz: 'biz' } })
    expect(output).toStrictEqual({ neat: 'biz' })
  })

  test('nested directive', () => {
    const output = map(
      { '@field': { '@field': 'foo' } },
      { foo: 'bar', bar: 'baz' }
    )
    expect(output).toStrictEqual('baz')
  })

  test('invalid path', () => {
    const output = map({ neat: { '@field': 'oops' } }, { foo: 'bar' })
    expect(output).toStrictEqual({ neat: undefined })
  })

  test('invalid key type', () => {
    expect(() => {
      map({ neat: { '@field': {} } }, { foo: 'bar' })
    }).toThrowError()
  })

  test('invalid nested value type', () => {
    const output = map({ neat: { '@field': 'foo.bar.baz' } }, { foo: 'bar' })
    expect(output).toStrictEqual({ neat: undefined })
  })

  test('empty path parts', () => {
    const output = map({ neat: { '@field': '.foo' } }, { foo: 'bar' })
    expect(output).toStrictEqual({ neat: undefined })
  })
})

describe('@handlebars', () => {
  test('basic', () => {
    const output = map({ '@handlebars': 'Hello, {{who}}!' }, { who: 'World' })
    expect(output).toStrictEqual('Hello, World!')
  })

  test('nested fields', () => {
    const output = map({ '@handlebars': 'Hello, {{who.name}}!' }, { who: { name: 'World' } })
    expect(output).toStrictEqual('Hello, World!')
  })

  test('no escaping', () => {
    const output = map({ '@handlebars': '<blink>{{a}} {{{a}}}</blink>' }, { a: '<b>Hi</b>' })
    expect(output).toStrictEqual('<blink><b>Hi</b> <b>Hi</b></blink>')
  })

  test('missing fields', () => {
    const output = map({ '@handlebars': '{{oops.yo}}' }, {})
    expect(output).toStrictEqual('')
  })

  test('invalid template', () => {
    expect(() => {
      map({ '@handlebars': '{{' }, {})
    }).toThrowError()
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
    const output = map({ '@lowercase': { '@field': 'foo' } }, { foo: str })
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
    const output = map({ '@merge': [{ cool: true }, { '@field': 'foo' }] }, { foo: { bar: 'baz' } })
    expect(output).toStrictEqual({ cool: true, bar: 'baz' })
  })

  test('invalid type', () => {
    expect(() => {
      map({ '@merge': { oops: true } })
    }).toThrowError()
  })

  test('invalid nested type', () => {
    expect(() => {
      map({ '@merge': [{}, 1] })
    }).toThrowError()
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
          object: { '@field': 'foo' },
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
          fields: { '@field': 'foo' }
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
          fields: [
            'a',
            { '@field': 'foo' }
          ]
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
          fields: ['a', 'c']
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
          object: { '@field': 'foo' },
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
          fields: { '@field': 'foo' }
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
          fields: [
            'a',
            { '@field': 'foo' }
          ]
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
    const output = map(
      { '@root': true },
      { cool: true }
    )
    expect(output).toStrictEqual({ cool: true })
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
          timestamp: { '@field': 'timestamp' },
          format: { '@field': 'format' }
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
            timestamp: { '@field': 'timestamp' },
            format: { '@field': 'format' }
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
            timestamp: { '@field': 'timestamp' },
            format: { '@field': 'format' }
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

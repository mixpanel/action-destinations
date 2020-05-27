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

  test('invalid path', () => {
    const output = map({ neat: { '@field': 'oops' } }, { foo: 'bar' })
    expect(output).toStrictEqual({ neat: undefined })
  })

  test('invalid key type', () => {
    expect(() => {
      map({ neat: { '@field': 1 } }, { foo: 'bar' })
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

const transform = require('./index')

describe('mapping validations', () => {
  test('mixed keys', () => {
    expect(() => {
      transform({ foo: 1, '@field': 2 }, {})
    }).toThrowError()
  })

  test('nested mixed keys', () => {
    expect(() => {
      transform({ foo: { bar: 1, '@field': 2 } }, {})
    }).toThrowError()
  })
})

describe('payload validations', () => {
  test('invalid type', () => {
    expect(() => { transform({ a: 1 }, 123) }).toThrowError()
    expect(() => { transform({ a: 1 }, []) }).toThrowError()
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

describe('@field', () => {
  test('simple', () => {
    const output = transform({ neat: { '@field': 'foo' } }, { foo: 'bar' })
    expect(output).toStrictEqual({ neat: 'bar' })
  })

  test('nested path', () => {
    const output = transform({ neat: { '@field': 'foo.bar' } }, { foo: { bar: 'baz' } })
    expect(output).toStrictEqual({ neat: 'baz' })
  })

  test('escaped nested path', () => {
    const output = transform({ neat: { '@field': 'foo\\.bar.baz' } }, { 'foo.bar': { baz: 'biz' } })
    expect(output).toStrictEqual({ neat: 'biz' })
  })

  test('invalid path', () => {
    const output = transform({ neat: { '@field': 'oops' } }, { foo: 'bar' })
    expect(output).toStrictEqual({ neat: undefined })
  })

  test('invalid key type', () => {
    expect(() => {
      transform({ neat: { '@field': 1 } }, { foo: 'bar' })
    }).toThrowError()
  })

  test('invalid nested value type', () => {
    const output = transform({ neat: { '@field': 'foo.bar.baz' } }, { foo: 'bar' })
    expect(output).toStrictEqual({ neat: undefined })
  })

  test('empty path parts', () => {
    const output = transform({ neat: { '@field': '.foo' } }, { foo: 'bar' })
    expect(output).toStrictEqual({ neat: undefined })
  })
})

describe('@handlebars', () => {
  test('basic', () => {
    const output = transform({ '@handlebars': 'Hello, {{who}}!' }, { who: 'World' })
    expect(output).toStrictEqual('Hello, World!')
  })

  test('nested fields', () => {
    const output = transform({ '@handlebars': 'Hello, {{who.name}}!' }, { who: { name: 'World' } })
    expect(output).toStrictEqual('Hello, World!')
  })

  test('no escaping', () => {
    const output = transform({ '@handlebars': '<blink>{{a}} {{{a}}}</blink>' }, { a: '<b>Hi</b>' })
    expect(output).toStrictEqual('<blink><b>Hi</b> <b>Hi</b></blink>')
  })

  test('missing fields', () => {
    const output = transform({ '@handlebars': '{{oops.yo}}' }, {})
    expect(output).toStrictEqual('')
  })

  test('invalid template', () => {
    expect(() => {
      transform({ '@handlebars': '{{' }, {})
    }).toThrowError()
  })
})

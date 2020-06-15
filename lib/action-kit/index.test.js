require('./index')

describe('Step base class', () => {
  test('toString()', () => {
    expect(action().toString()).toStrictEqual('[step Entrypoint0]')
  })
})

describe('action()', () => {
  test('basic settings', async () => {
    const settings = { a: 1 }
    const result = await action().execute({ settings })
    expect(result.error).toBeNull()
    expect(settings).toStrictEqual({ a: 1 }) // no map/transform
  })

  test('map settings', async () => {
    const settings = { a: { '@path': '$.foo' } }
    const payload = { foo: 'bar' }
    let ctx = {}
    const result = await action().do((c) => { ctx = c }).execute({ settings, payload })
    expect(result.error).toBeNull()
    expect(ctx.settings).toStrictEqual({ a: 'bar' })
  })

  test('no payload mapping', async () => {
    const payload = { a: 1 }
    let ctx = {}
    const result = await action().do((c) => { ctx = c }).execute({ payload })
    expect(result.error).toBeNull()
    expect(ctx.payload).toStrictEqual({ a: 1 })
  })

  test('basic payload mapping', async () => {
    const mapping = { a: 1, c: { '@path': '$.b' } }
    const payload = { b: 2 }
    let ctx = {}
    const result = await action().do((c) => { ctx = c }).execute({ mapping, payload })
    expect(result.error).toBeNull()
    expect(ctx.payload).toStrictEqual({ a: 1, c: 2 })
  })
})

describe('validateSettings', () => {
  const schema = {
    type: 'object',
    properties: {
      a: {
        type: 'number'
      }
    },
    required: ['a']
  }

  test('valid', async () => {
    const settings = { a: { '@path': '$.foo' } }
    const payload = { foo: 1 }
    let ctx = {}
    const result = await action().validateSettings(schema).do((c) => { ctx = c }).execute({ settings, payload })
    expect(result.error).toBeNull()
    expect(ctx.settings).toStrictEqual({ a: 1 })
  })

  test('invalid', async () => {
    const settings = { a: { '@path': '$.foo' } }
    const payload = { foo: 'wrong type' }
    const result = await action(schema).validateSettings(schema).execute({ settings, payload })
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error.toString()).toBe('Error: Settings are invalid: .a should be number')
  })
})

describe('validatePayload', () => {
  const schema = {
    type: 'object',
    properties: {
      a: {
        type: 'number'
      }
    },
    required: ['a']
  }

  test('valid', async () => {
    const mapping = { a: { '@path': '$.foo' } }
    const payload = { foo: 1 }
    let ctx = {}
    const result = await action().validatePayload(schema).do((c) => { ctx = c }).execute({ mapping, payload })
    expect(result.error).toBeNull()
    expect(ctx.payload).toStrictEqual({ a: 1 })
  })

  test('invalid', async () => {
    const mapping = { a: { '@path': '$.foo' } }
    const payload = { foo: 'wrong type' }
    const result = await action().validatePayload(schema).execute({ mapping, payload })
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error.toString()).toBe('Error: Payload is invalid: .a should be number')
  })
})

describe('fanOut()', () => {
  test('fans out on array', async () => {
    const vals = [1, 2, 3, 4, 5]
    const done = []

    await action()
      .fanOut({ on: '$.payload.vals', as: 'val' })
      .do(({ val }) => { done.push(val) })
      .fanIn()
      .execute({ payload: { vals } })

    expect(done.sort()).toStrictEqual(vals)
  })

  test('fans out on constructed array', async () => {
    const vals = [{ x: 1 }, { x: 2 }]
    const done = []

    await action()
      .fanOut({ on: '$.payload.vals..x', as: 'val' })
      .do(({ val }) => { done.push(val) })
      .fanIn()
      .execute({ payload: { vals } })

    expect(done.sort()).toStrictEqual([1, 2])
  })

  test('requires at least one step', async () => {
    const result = await action()
      .fanOut({ on: '$.a', as: 'b' })
      .fanIn()
      .execute({ a: [1, 2] })

    expect(result.error).toBeInstanceOf(Error)
  })

  test('requires "on" option', async () => {
    const result = await action()
      .fanOut({ as: 'b' })
      .do(() => {})
      .fanIn()
      .execute({ a: [1, 2] })

    expect(result.error).toBeInstanceOf(Error)
  })

  test('requires "as" option', async () => {
    const result = await action()
      .fanOut({ on: '$.a' })
      .do(() => {})
      .fanIn()
      .execute({ a: [1, 2] })

    expect(result.error).toBeInstanceOf(Error)
  })
})

describe('map()', () => {
  test('simple', async () => {
    await action().map(
      { a: 1 }
    ).do(({ payload }) => {
      expect(payload).toStrictEqual({ a: 1 })
    }).execute({ payload: { a: 2 } })
  })

  test('merge', async () => {
    await action().map(
      { a: 1 },
      { merge: true }
    ).do(({ payload }) => {
      expect(payload).toStrictEqual({ a: 1, b: 3 })
    }).execute({ payload: { a: 2, b: 3 } })
  })
})

describe('do()', () => {
  test('simple', async () => {
    let called = false
    await action().do(() => { called = true }).execute({})
    expect(called).toBe(true)
  })
})

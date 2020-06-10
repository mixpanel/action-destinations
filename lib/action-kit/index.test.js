require('./index')

describe('Step base class', () => {
  test('toString()', () => {
    expect(action().toString()).toStrictEqual('[step Entrypoint0]')
  })
})

describe('settings()', () => {
  test('TODO', () => {
    // Going to rewrite settings to use JSON Schema and mapping.
    expect(true).toBe(false)
  })
})

describe('schema()', () => {
  const schema = {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    properties: {
      foo: {
        type: 'string'
      },
      bar: {
        type: 'string',
        default: 'default value'
      }
    },
    required: ['foo']
  }

  const execute = async (payload) => {
    return action().schema(schema).execute({ payload })
  }

  test('pass', async () => {
    const payload = { foo: 'hello' }
    await expect(execute(payload)).resolves.not.toThrow()
    // Fill in default values as a side-effect
    expect(payload.bar).toBe('default value')
  })

  test('fail', async () => {
    const result = await execute({})
    expect(result.error).toBeInstanceOf(Error)
  })

  test('invalid schema', () => {
    // TODO
    action().schema({ oops: true })
  })
})

describe('fanOut()', () => {
  test('fans out', async () => {
    const vals = [1, 2, 3, 4, 5]
    const done = []

    await action()
      .fanOut({ on: 'vals', as: 'val' })
      .do(({ val }) => { done.push(val) })
      .fanIn()
      .execute({ vals: vals })

    expect(done.sort()).toStrictEqual(vals)
  })

  test('requires at least one step', async () => {
    const result = await action()
      .fanOut({ on: 'a', as: 'b' })
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
      .fanOut({ on: 'a' })
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

require('./index')

describe('settings()', () => {
  const execute = async (config, settings) => {
    return action().settings(config)._execute({ settings })
  }

  test('empty', async () => {
    await expect(
      execute([], {})
    ).resolves.not.toThrow()
  })

  test('type only', async () => {
    await expect(
      execute(
        [{ slug: 'a', type: 'string' }],
        { a: 'hello' }
      )
    ).resolves.not.toThrow()

    await expect(
      execute(
        [{ slug: 'a', type: 'strings' }],
        { a: ['hello'] }
      )
    ).resolves.not.toThrow()

    await expect(
      execute(
        [{ slug: 'a', type: 'string' }],
        { a: 1234 }
      )
    ).rejects.toThrow()

    await expect(
      execute(
        [{ slug: 'a', type: 'strings' }],
        { a: 'oops' }
      )
    ).rejects.toThrow()
  })

  describe('validators: length', () => {
    describe('string', () => {
      const len = (opts) => (
        [{
          slug: 'a',
          type: 'string',
          validations: [{
            validation: 'length',
            ...opts
          }]
        }]
      )

      test('min', async () => {
        await expect(
          execute(len({ min: 1 }), { a: 'x' })
        ).resolves.not.toThrow()

        await expect(
          execute(len({ min: 1 }), { a: 'hello' })
        ).resolves.not.toThrow()

        await expect(
          execute(len({ min: 1 }), { a: '' })
        ).rejects.toThrow()
      })

      test('max', async () => {
        await expect(
          execute(len({ max: 1 }), { a: '' })
        ).resolves.not.toThrow()

        await expect(
          execute(len({ max: 1 }), { a: 'x' })
        ).resolves.not.toThrow()

        await expect(
          execute(len({ max: 1 }), { a: 'hello' })
        ).rejects.toThrow()
      })
    })

    describe('strings', () => {
      const len = (opts) => (
        [{
          slug: 'a',
          type: 'strings',
          validations: [{
            validation: 'length',
            ...opts
          }]
        }]
      )

      test('min', async () => {
        await expect(
          execute(len({ min: 1 }), { a: ['hello'] })
        ).resolves.not.toThrow()

        await expect(
          execute(len({ min: 1 }), { a: ['hello', 'world!'] })
        ).resolves.not.toThrow()

        await expect(
          execute(len({ min: 1 }), { a: [] })
        ).rejects.toThrow()
      })

      test('max', async () => {
        await expect(
          execute(len({ max: 1 }), { a: [] })
        ).resolves.not.toThrow()

        await expect(
          execute(len({ max: 1 }), { a: ['hello'] })
        ).resolves.not.toThrow()

        await expect(
          execute(len({ max: 1 }), { a: ['hello', 'world!'] })
        ).rejects.toThrow()
      })
    })
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
    return action().schema(schema)._execute({ payload })
  }

  test('pass', async () => {
    const payload = { foo: 'hello' }
    await expect(execute(payload)).resolves.not.toThrow()
    // Fill in default values as a side-effect
    expect(payload.bar).toBe('default value')
  })

  test('fail', async () => {
    await expect(execute({})).rejects.toThrow()
  })

  test('invalid schema', () => {
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
      ._execute({ vals: vals })

    expect(done.sort()).toStrictEqual(vals)
  })

  test('requires at least one step', async () => {
    await expect(
      action()
        .fanOut({ on: 'a', as: 'b' })
        .fanIn()
        ._execute({ a: [1, 2] })
    ).rejects.toThrow()
  })

  test('requires "on" option', async () => {
    await expect(
      action()
        .fanOut({ as: 'b' })
        .do(() => {})
        .fanIn()
        ._execute({ a: [1, 2] })
    ).rejects.toThrow()
  })

  test('requires "as" option', async () => {
    await expect(
      action()
        .fanOut({ on: 'a' })
        .do(() => {})
        .fanIn()
        ._execute({ a: [1, 2] })
    ).rejects.toThrow()
  })
})

describe('map()', () => {
  test('simple', async () => {
    await action().map(
      { a: 1 }
    ).do(({ payload }) => {
      expect(payload).toStrictEqual({ a: 1 })
    })._execute({ payload: { a: 2 } })
  })

  test('merge', async () => {
    await action().map(
      { a: 1 },
      { merge: true }
    ).do(({ payload }) => {
      expect(payload).toStrictEqual({ a: 1, b: 3 })
    })._execute({ payload: { a: 2, b: 3 } })
  })
})

describe('do()', () => {
  test('simple', async () => {
    let called = false
    await action().do(() => { called = true })._execute({})
    expect(called).toBe(true)
  })
})

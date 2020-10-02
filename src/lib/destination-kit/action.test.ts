/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action } from './action'

describe('Step base class', () => {
  test('toString()', () => {
    expect(new Action().toString()).toStrictEqual('[step Action0]')
  })
})

describe('action()', () => {
  test('basic settings', async () => {
    const settings = { a: 1 }
    const result = await new Action().execute({ settings })

    expect(result.error).toBeNull()
    expect(settings).toStrictEqual({ a: 1 }) // no map/transform
  })

  test('map settings', async () => {
    const settings = { a: { '@path': '$.foo' } }
    const payload = { foo: 'bar' }

    let ctx: any = {}

    const result = await new Action()
      .do((c: any) => {
        ctx = c
      })
      .execute({ settings, payload })

    expect(result.error).toBeNull()
    expect(ctx.settings).toStrictEqual({ a: 'bar' })
  })

  test('no payload mapping', async () => {
    const payload = { a: 1 }
    let ctx: any = {}

    const result = await new Action()
      .do((c: any) => {
        ctx = c
      })
      .execute({ payload })

    expect(result.error).toBeNull()
    expect(ctx.payload).toStrictEqual({ a: 1 })
  })

  test('basic payload mapping', async () => {
    const mapping = { a: 1, c: { '@path': '$.b' } }
    const payload = { b: 2 }
    let ctx: any = {}

    const result = await new Action()
      .do((c: any) => {
        ctx = c
      })
      .execute({ mapping, payload })

    expect(result.error).toBeNull()
    expect(ctx.payload).toStrictEqual({ a: 1, c: 2 })
  })
})

describe('validateSettings', () => {
  const schema = {
    type: 'object',
    properties: {
      a: {
        title: 'Foo',
        type: 'number'
      }
    },
    required: ['a']
  }

  test('valid', async () => {
    const settings = { a: { '@path': '$.foo' } }
    const payload = { foo: 1 }
    let ctx: any = {}

    const result = await new Action()
      .validateSettings(schema)
      .do((c: any) => {
        ctx = c
      })
      .execute({ settings, payload })

    expect(result.error).toBeNull()
    expect(ctx.settings).toStrictEqual({ a: 1 })
  })

  test('invalid', async () => {
    const settings = { a: { '@path': '$.foo' } }
    const payload = { foo: 'wrong type' }

    const result = await new Action().validateSettings(schema).execute({ settings, payload })

    expect(result.error).toBeInstanceOf(Error)
    expect(result.error.toString()).toBe('AggregateAjvError: Foo should be a number but it was a string.')
  })
})

describe('validatePayload', () => {
  const schema = {
    type: 'object',
    properties: {
      a: {
        title: 'Foo',
        type: 'number'
      }
    },
    required: ['a']
  }

  test('valid', async () => {
    const mapping = { a: { '@path': '$.foo' } }
    const payload = { foo: 1 }
    let ctx: any = {}

    const result = await new Action()
      .validatePayload(schema)
      .do((c: any) => {
        ctx = c
      })
      .execute({ mapping, payload })

    expect(result.error).toBeNull()
    expect(ctx.payload).toStrictEqual({ a: 1 })
  })

  test('invalid', async () => {
    const mapping = { a: { '@path': '$.foo' } }
    const payload = { foo: 'wrong type' }

    const result = await new Action().validatePayload(schema).execute({ mapping, payload })

    expect(result.error).toBeInstanceOf(Error)
    expect(result.error.toString()).toBe('AggregateAjvError: Foo should be a number but it was a string.')
  })
})

describe('fanOut()', () => {
  test('fans out on array', async () => {
    const vals = [1, 2, 3, 4, 5]
    const done: any[] = []

    await new Action()
      .fanOut({ on: '$.payload.vals', as: 'val' })
      .do(({ val }: any) => {
        done.push(val)
      })
      .fanIn()
      .execute({ payload: { vals } })

    expect(done.sort()).toStrictEqual(vals)
  })

  test('fans out on constructed array', async () => {
    const vals = [{ x: 1 }, { x: 2 }]
    const done: any[] = []

    await new Action()
      .fanOut({ on: '$.payload.vals..x', as: 'val' })
      .do(({ val }: any) => {
        done.push(val)
      })
      .fanIn()
      .execute({ payload: { vals } })

    expect(done.sort()).toStrictEqual([1, 2])
  })

  test('requires at least one step', async () => {
    const result = await new Action()
      .fanOut({ on: '$.a', as: 'b' })
      .fanIn()
      .execute({ a: [1, 2] })

    expect(result.error).toBeInstanceOf(Error)
  })
})

describe('mapField()', () => {
  test('field exists', async () => {
    await new Action()
      .mapField('$.a', {
        '@lowercase': { '@path': '$.a' }
      })
      .do(({ payload }: any) => {
        expect(payload).toStrictEqual({ a: 'hi' })
      })
      .execute({ payload: { a: 'HI' } })

    // Path without '$'
    await new Action()
      .mapField('a', {
        '@lowercase': { '@path': '$.a' }
      })
      .do(({ payload }: any) => {
        expect(payload).toStrictEqual({ a: 'hi' })
      })
      .execute({ payload: { a: 'HI' } })
  })

  test("field doesn't exist", async () => {
    await new Action()
      .mapField('$.oops', {
        '@lowercase': { '@path': '$.a' }
      })
      .do(({ payload }: any) => {
        expect(payload).toStrictEqual({ a: 1 })
      })
      .execute({ payload: { a: 1 } })
  })

  test('nested field', async () => {
    await new Action()
      .mapField('$.a.b.c', {
        '@lowercase': { '@path': '$.x' }
      })
      .do(({ payload }: any) => {
        expect(payload).toStrictEqual({ x: 'FOO', a: { b: { c: 'foo' } } })
      })
      .execute({ payload: { x: 'FOO', a: { b: { c: 'HI' } } } })
  })
})

import http from 'http'

const serveJSON = (code: number, body: any): { url: string; close: Function } => {
  const server = http.createServer((_, resp) => {
    resp
      .writeHead(code, {
        'Content-Type': 'applidation/json'
      })
      .end(JSON.stringify(body))
  })

  server.listen()

  const addr = server.address()

  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  const url = `http://[${addr.address}]:${addr.port}/`

  return {
    url,
    close: (): void => {
      server.close()
    }
  }
}

describe('request()', () => {
  test('200 request', async () => {
    const server = serveJSON(200, { cool: true })

    const out = await new Action().request(req => req.get(server.url)).execute({})
    server.close()

    expect(out.error).toBeNull()
    expect(out.output).toHaveLength(2)
    expect(out.output[1].output).toEqual('{"cool":true}')
  })

  test('500 request', async () => {
    const server = serveJSON(500, { oops: true })

    const out = await new Action().request(req => req.get(server.url)).execute({})
    server.close()

    expect(out.error).not.toBeNull()
    expect(out.error.response.statusCode).toBe(500)
  })
})

describe('cachedRequest()', () => {
  test('cache miss', async () => {
    const user = { name: 'Mr. T' }
    let gotUser
    const out = await new Action()
      .cachedRequest({
        ttl: 60,
        key: () => 'x',
        value: async () => user,
        as: 'user'
      })
      .do(({ user }: any) => {
        gotUser = user
      })
      .execute({ payload: { id: 1 } })

    expect(out.error).toBeNull()
    expect(out.output).toHaveLength(3)
    expect(out.output[1].output).toEqual('cache miss')
    expect(gotUser).toEqual(user)
  })

  test('cache hit', async () => {
    const user = { name: 'Mr. T' }
    let gotUser

    const act = new Action()
      .cachedRequest({
        ttl: 60,
        key: () => 'x',
        value: async () => user,
        as: 'user'
      })
      .do(({ user }: any) => {
        gotUser = user
      })

    // Fill cache
    await act.execute({ payload: { id: 1 } })

    // Cache should be filled
    const out = await act.execute({ payload: { id: 1 } })

    expect(out.error).toBeNull()
    expect(out.output).toHaveLength(3)
    expect(out.output[1].output).toEqual('cache hit')
    expect(gotUser).toEqual(user)
  })

  test('cache isolation', async () => {
    const key = 'x'
    const user1 = { name: 'Mr. T' }
    const user2 = { name: 'Ms. Piggy' }
    let gotUser1, gotUser2

    await new Action()
      .cachedRequest({
        ttl: 60,
        key: () => key,
        value: async () => user1,
        as: 'user1'
      })
      .cachedRequest({
        ttl: 60,
        key: () => key, // re-use they key to ensure isolation
        value: async () => user2,
        as: 'user2'
      })
      .do(({ user1, user2 }: any) => {
        gotUser1 = user1
        gotUser2 = user2
      })
      .execute({ payload: { id: 1 } })

    expect(gotUser1).toEqual(user1)
    expect(gotUser2).toEqual(user2)
  })

  test('200 response', async () => {
    const server = serveJSON(200, { cool: true })

    const out = await new Action()
      .cachedRequest({
        ttl: 60,
        key: () => 'x',
        value: async req => {
          const resp = await req.get(server.url)
          return resp.body
        },
        as: 'user'
      })
      .execute({})

    server.close()

    expect(out.error).toBeNull()
    expect(out.output).toHaveLength(2)
    expect(out.output[1].output).toEqual('cache miss')
  })

  test('404 response', async () => {
    const server = serveJSON(404, {})

    let gotUser

    const out = await new Action()
      .cachedRequest({
        ttl: 60,
        key: () => 'x',
        value: async req => {
          const resp = await req.get(server.url)
          return resp.body
        },
        as: 'user'
      })
      .do(({ user }: any) => {
        gotUser = user
      })
      .execute({})

    server.close()

    expect(out.error).toBeNull()
    expect(out.output).toHaveLength(3)
    expect(out.output[1].output).toEqual('cache miss')
    expect(gotUser).toBeNull()
  })

  test('500 response', async () => {
    const server = serveJSON(500, {})

    const out = await new Action()
      .cachedRequest({
        ttl: 60,
        key: () => 'x',
        value: async req => {
          const resp = await req.get(server.url)
          return resp.body
        },
        as: 'user'
      })
      .execute({})

    server.close()

    expect(out.error).not.toBeNull()
  })
})

describe('do()', () => {
  test('simple', async () => {
    let called = false

    await new Action()
      .do(() => {
        called = true
      })
      .execute({})

    expect(called).toBe(true)
  })
})

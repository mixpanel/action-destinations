/* eslint-disable @typescript-eslint/no-explicit-any */
import http from 'http'
import express, { Request, Response, NextFunction } from 'express'
import listen from 'test-listen'
import got from 'got'
import * as Sentry from '@sentry/node'
import core from '../core'
import logger from '@/lib/logger'
import stats from '@/lib/stats'
import Context from '@/lib/context'

const client = got.extend({
  retry: 0, // Disable retries so that 500 errors don't make the tests super slow
  responseType: 'json',
  throwHttpErrors: false
})

const app = express()
const router = express.Router()
app.use(core)
app.use(router)

// Return errors so that jest can output something actionable when the route/middleware throws an error
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500)
  res.json({
    name: error.name,
    message: error.message,
    stack: error.stack
  })
})

const server = http.createServer(app)
let url: string
beforeAll(async () => {
  url = await listen(server)
})

beforeEach(() => {
  // Reset the router after every test. This allows the test routes to be located in the tests
  router.stack = []
  jest.resetAllMocks()
})

afterAll((cb): void => {
  server.close(cb)
})

test(`can process a request`, async () => {
  router.get('/', (_req, res) => {
    res.json({ ok: true })
  })

  const res = await client(url)

  expect(res).toMatchObject({ statusCode: 200, body: { ok: true } })
})

test(`stores request and response details in the context`, async () => {
  let ctx: Context | undefined
  router.get('/test', (req, res) => {
    ctx = req.context
    res.json({ ok: true })
  })

  const res = await client(`${url}/test`, { searchParams: { test: true } })

  expect(res).toMatchObject({ statusCode: 200, body: { ok: true } })
  expect(ctx?.__get('http_req_method')).toBe('GET')
  expect(ctx?.__get('http_req_path')).toBe('/test')
  expect(ctx?.__get('http_req_query')).toEqual({ test: 'true' })
  expect(ctx?.__get('http_req_headers')).toMatchObject({ accept: 'application/json' })
  expect(ctx?.__get('http_req_ip')).toBeTruthy()
  expect(ctx?.__get('http_res_status')).toBe(200)
  expect(ctx?.__get('http_res_headers')).toMatchObject({ 'content-type': 'application/json; charset=utf-8' })
  expect(ctx?.__get('http_res_size')).toEqual(expect.any(Number))
  expect(ctx?.__get('req_route')).toBe('/test')
})

test(`adds the request duration to the context`, async () => {
  let ctx: Context | undefined
  router.get('/', (req, res) => {
    ctx = req.context
    setTimeout(() => {
      res.json({ ok: true })
    }, 50)
  })

  const res = await client(url)

  expect(res).toMatchObject({ statusCode: 200, body: { ok: true } })
  expect(ctx?.__get('req_duration')).toBeGreaterThanOrEqual(45)
  expect(ctx?.__get('req_duration')).toBeLessThanOrEqual(100)
})

test(`sends metrics`, async () => {
  router.get('/', (_, res) => {
    res.json({ ok: true })
  })
  const spy = jest.spyOn(stats, 'increment')

  const res = await client(url)

  expect(res).toMatchObject({ statusCode: 200, body: { ok: true } })
  expect(spy).toHaveBeenCalledWith(
    'request',
    1,
    expect.arrayContaining([`status_code:200`, `status_group:2xx`, `endpoint:GET /`])
  )
})

test(`logs the request`, async () => {
  router.get('/', (_req, res) => {
    res.json({ ok: true })
  })
  const spy = jest.spyOn(logger, 'log').mockImplementation()

  const res = await client(url)

  expect(res).toMatchObject({ statusCode: 200, body: { ok: true } })
  expect(spy).toHaveBeenCalledWith('info', expect.stringContaining('200 GET / - '), expect.anything())
})

test(`doesn't send metrics/log the health endpoint`, async () => {
  router.get('/health', (_req, res) => {
    res.json({ ok: true })
  })
  const statsSpy = jest.spyOn(stats, 'increment')
  const loggerSpy = jest.spyOn(logger, 'log').mockImplementation()

  const res = await client(`${url}/health`)

  expect(res).toMatchObject({ statusCode: 200, body: { ok: true } })
  expect(statsSpy).not.toHaveBeenCalled()
  expect(loggerSpy).not.toHaveBeenCalled()
})

test(`logs the request error`, async () => {
  router.get('/', (req, res) => {
    req.context.set('error', new Error('test error'))
    res.status(500)
    res.json({ ok: true })
  })
  const spy = jest.spyOn(logger, 'log').mockImplementation()

  const res = await client(url)

  expect(res).toMatchObject({ statusCode: 500, body: { ok: true } })
  expect(spy).toHaveBeenCalledWith('error', expect.stringContaining('500 GET / - '), expect.anything())
})

test(`handles errors before request`, async () => {
  router.get('/', (_req, res) => {
    res.json({ ok: true })
  })
  jest.spyOn(Context.prototype, 'set').mockImplementation(() => {
    throw new Error('test error')
  })
  const loggerSpy = jest.spyOn(logger, 'log').mockImplementation()
  const sentrySpy = jest.spyOn(Sentry, 'captureException')
  const statsSpy = jest.spyOn(stats, 'increment')

  const res = await client(url)

  expect(res).toMatchObject({
    statusCode: 500,
    body: {
      name: 'Error',
      message: 'test error'
    }
  })
  expect(loggerSpy).toHaveBeenCalledWith('crit', expect.stringContaining('core middleware error'), {
    error: new Error('test error'),
    http_req_method: expect.any(String),
    http_req_path: expect.any(String),
    http_req_query: expect.any(Object),
    http_req_ip: expect.any(String)
  })
  expect(sentrySpy).toHaveBeenCalledWith(new Error('test error'))
  expect(statsSpy).toHaveBeenCalledWith('error', 1, expect.arrayContaining([`endpoint:core-middleware`]))
})

test(`handles errors after response`, async () => {
  router.get('/', (_req, res) => {
    res.json({ ok: true })
  })
  jest.spyOn(Context.prototype, 'getError').mockImplementation(() => {
    throw new Error('test error')
  })
  const loggerSpy = jest.spyOn(logger, 'log').mockImplementation()
  const sentrySpy = jest.spyOn(Sentry, 'captureException')
  const statsSpy = jest.spyOn(stats, 'increment')

  const res = await client(url)

  expect(res).toMatchObject({ statusCode: 200, body: { ok: true } })
  expect(loggerSpy).toHaveBeenCalledWith('crit', expect.stringContaining('core middleware error'), {
    error: new Error('test error'),
    http_req_method: expect.any(String),
    http_req_path: expect.any(String),
    http_req_query: expect.any(Object),
    http_req_ip: expect.any(String)
  })
  expect(sentrySpy).toHaveBeenCalledWith(new Error('test error'))
  expect(statsSpy).toHaveBeenCalledWith('error', 1, expect.arrayContaining([`endpoint:core-middleware`]))
})

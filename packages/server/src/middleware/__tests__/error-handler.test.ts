/* eslint-disable @typescript-eslint/no-explicit-any */
import http from 'http'
import express, { Request, Response, NextFunction } from 'express'
import listen from 'test-listen'
import got from 'got'
import errorHandler from '../error-handler'
import Context from '@/lib/context'

const client = got.extend({
  retry: 0, // Disable retries so that 500 errors don't make the tests super slow
  throwHttpErrors: false,
  responseType: 'json'
})

const app = express()
const router = express.Router()

app.use((req, _res, next) => {
  req.context = new Context()
  next()
})

app.use(express.json())
app.use(router)
app.use(errorHandler)

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
})

afterAll((cb): void => {
  server.close(cb)
})

test('exceptions return status 500', async () => {
  router.get('/', () => {
    throw new Error('test error')
  })

  const res = await client(url)

  expect(res).toMatchObject({
    body: {
      status: 500,
      error: 'test error'
    }
  })
})

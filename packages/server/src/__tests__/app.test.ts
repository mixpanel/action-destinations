import listen from 'test-listen'
import got from 'got'
import server from '../app'

const client = got.extend({
  retry: 0, // Disable retries so that 500 errors don't make the tests super slow
  throwHttpErrors: false
})

let url: string
beforeAll(async () => {
  if (server.listening) {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err)
        } else {
          resolve(undefined)
        }
      })
    })
  }
  url = await listen(server)
})

afterAll((cb): void => {
  server.close(cb)
})

test('healthcheck returns status 204', async () => {
  const res = await client(`${url}/health`)
  expect(res.statusCode).toEqual(204)
})

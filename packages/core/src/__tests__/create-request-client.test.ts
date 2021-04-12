import btoa from 'btoa-lite'
import nock from 'nock'
import createRequestClient from '../create-request-client'

describe('createRequestClient', () => {
  it('should create a request client instance that has Segment defaults', async () => {
    const log: Record<string, any> = {}

    const request = createRequestClient({
      afterResponse: [
        (request, options, response) => {
          log.request = request
          log.options = options
          log.response = response
        }
      ]
    })

    nock('https://example.com').get('/').reply(200, 'Hello world!')

    await request('http://example.com')
    expect(log.request.headers.get('user-agent')).toBe('Segment')
    expect(log.options.timeout).toBe(10000)
  })

  it('should merge custom options when creating the request client instance', async () => {
    const log: Record<string, any> = {}

    const request = createRequestClient({
      headers: { Authorization: `Bearer supersekret` },
      afterResponse: [
        (request, options, response) => {
          log.request = request
          log.options = options
          log.response = response
        }
      ]
    })

    nock('https://api.sendgrid.com/v3').get('/hello-world').reply(200, { greeting: 'Yo' })

    const response = await request('https://api.sendgrid.com/v3/hello-world', { headers: { 'user-agent': 'foo' } })
    expect(await response.json()).toMatchObject({ greeting: 'Yo' })
    expect(response.url).toBe('https://api.sendgrid.com/v3/hello-world')
    expect(log.request).toBeDefined()
    expect(log.request.url).toBe('https://api.sendgrid.com/v3/hello-world')
    expect(log.request.headers.get('user-agent')).toBe('foo')
    expect(log.request.headers.get('authorization')).toBe('Bearer supersekret')
  })

  it('should automatically base64 encode username:password', async () => {
    const log: Record<string, any> = {}

    const request = createRequestClient({
      afterResponse: [
        (request, options, response) => {
          log.request = request
          log.options = options
          log.response = response
        }
      ]
    })

    nock('https://example.com').get('/hello-world').reply(200, { greeting: 'Yo' })

    await request('https://example.com/hello-world', { username: 'foo', password: 'bar' })
    expect(log.request.headers.get('authorization')).toBe(`Basic ${btoa('foo:bar')}`)
  })
})

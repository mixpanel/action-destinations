import nock from 'nock'
import createRequestClient from '../create-request-client'

describe('createRequestClient', () => {
  it('should create a request client instance that has Segment defaults', async () => {
    const request = createRequestClient()

    nock('https://example.com').get('/').reply(200, 'Hello world!')

    const response = await request.get('http://example.com')
    expect(response.request.options.headers).toMatchObject({ 'user-agent': 'Segment' })
    expect(response.request.options.retry.limit).toBe(0)
    expect(response.request.options.timeout.request).toBe(5000)
  })

  it('should merge custom options when creating the request client instance', async () => {
    const request = createRequestClient({
      prefixUrl: 'https://api.sendgrid.com/v3/',
      headers: { Authorization: `Bearer supersekret` },
      responseType: 'json',
      timeout: 10000
    })

    nock('https://api.sendgrid.com/v3').get('/hello-world').reply(200, { greeting: 'Yo' })

    const response = await request.get('hello-world')
    expect(response.body).toMatchObject({ greeting: 'Yo' })
    expect(response.requestUrl).toBe('https://api.sendgrid.com/v3/hello-world')
    expect(response.request.options.headers).toMatchObject({ authorization: 'Bearer supersekret' })
  })
})

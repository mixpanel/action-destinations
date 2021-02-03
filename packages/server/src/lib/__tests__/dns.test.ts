import dns from 'dns'
import got from 'got'
import nock from 'nock'
import '../patch-http'

jest.mock('dns', () => ({
  // @ts-ignore
  ...jest.requireActual('dns'),
  lookup: jest.fn()
}))
const mockedDns = dns as jest.Mocked<typeof dns>

const client = got.extend({
  retry: 0,
  throwHttpErrors: false,
  dnsCache: false
})

describe('dns#lookup', () => {
  test('bubbles the original error', async () => {
    // @ts-ignore
    mockedDns.lookup.mockImplementationOnce((_hostname, _options, callback) => {
      callback(new Error('Nope!'))
    })

    try {
      await client('https://example.com')
    } catch (error) {
      expect(error.message).toBe('Nope!')
    }
  })

  test('bubbles an error when resolving a restricted ip', async () => {
    // @ts-ignore
    mockedDns.lookup.mockImplementationOnce((_hostname, _options, callback) => {
      // Note: no error from the lookup, we get back a valid (restricted) ip
      callback(null, '169.254.169.254', 4)
    })

    try {
      await client('https://example.com')
    } catch (error) {
      expect(error.message).toBe('"example.com" is a restricted hostname.')
    }
  })

  test('bubbles an error when using a restricted ip even without dns lookup', async () => {
    try {
      await client('http://169.254.169.254')
    } catch (error) {
      expect(error.message).toBe('"169.254.169.254" is a restricted ip.')
    }
  })

  test('bubbles an error when resolving a restricted IPv6 address', async () => {
    // @ts-ignore
    mockedDns.lookup.mockImplementationOnce((_hostname, _options, callback) => {
      // Note: no error from the lookup, we get back a valid (restricted) ip
      callback(null, '0:0:0:0:0:ffff:a9fe:a9fe', 6)
    })

    try {
      await client('https://example.com')
    } catch (error) {
      expect(error.message).toBe('"example.com" is a restricted hostname.')
    }
  })

  test('bubbles an error when resolving multiple ips and any of them are restricted', async () => {
    // @ts-ignore
    mockedDns.lookup.mockImplementationOnce((_hostname, _options, callback) => {
      callback(null, ['169.254.169.254', '93.184.216.34'])
    })

    try {
      await client('https://example.com')
    } catch (error) {
      expect(error.message).toBe('"example.com" is a restricted hostname.')
    }
  })

  test('allows requests to an unrestricted ip', async () => {
    // @ts-ignore
    mockedDns.lookup.mockImplementationOnce((_hostname, _options, callback) => {
      // Note: no error from the lookup, we get back a valid (unrestricted) ip
      callback(null, '93.184.216.34', 4)
    })

    nock('https://example.com').get('/').reply(200, 'Hello world!')

    const response = await client('https://example.com')
    expect(response.body).toEqual('Hello world!')
  })
})

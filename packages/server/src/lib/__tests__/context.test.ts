import Context from '../context'
import logger from '@/lib/logger'
import stats from '@/lib/stats'

test('can set a field', () => {
  const ctx = new Context()
  ctx.set('req_duration', 10)

  expect(ctx.__get('req_duration')).toEqual(10)
})

test('can append a field', () => {
  const ctx = new Context()

  const subscription = {
    duration: 1,
    destination: 'some destination',
    action: 'some action',
    subscribe: 'foo',
    state: 'done',
    input: {
      payload: {},
      settings: {}
    },
    output: []
  }

  ctx.append('subscriptions', subscription)

  expect(ctx.__get('subscriptions')).toEqual([subscription])
})

test('can get error', () => {
  const ctx = new Context()
  ctx.set('error', new Error('test'))

  expect(ctx.getError()).toMatchInlineSnapshot(`[Error: test]`)
})

test('can log a message', () => {
  const spy = jest.spyOn(logger, 'log').mockImplementation()

  const ctx = new Context()
  ctx.set('http_req_method', 'get')
  ctx.log('info', 'test')

  expect(spy).toHaveBeenCalledWith('info', 'test', expect.objectContaining({ http_req_method: 'get' }))
})

test('can log a message with additional data', () => {
  const spy = jest.spyOn(logger, 'log').mockImplementation()

  const ctx = new Context()
  ctx.set('http_req_method', 'get')
  ctx.log('info', 'test', { extra: 'data' })

  expect(spy).toHaveBeenCalledWith('info', 'test', expect.objectContaining({ http_req_method: 'get', extra: 'data' }))
})

test(`sends request metrics`, async () => {
  const incrementSpy = jest.spyOn(stats, 'increment')
  const histogramSpy = jest.spyOn(stats, 'histogram')

  const ctx = new Context()
  ctx.set('http_res_status', 500)
  ctx.set('http_res_size', 52)
  ctx.set('http_req_method', 'GET')
  ctx.set('http_req_path', '/')
  ctx.set('http_req_headers', { 'user-agent': 'Segment (gateway-api)' })
  ctx.set('req_duration', 3)
  ctx.set('error', new Error('test error'))
  ctx.sendMetrics()

  const tags = [`status_code:500`, `status_group:5xx`, `endpoint:GET /`, `user_agent:gateway-api`]

  expect(incrementSpy).toHaveBeenCalledWith('request', 1, expect.arrayContaining(tags))
  expect(histogramSpy).toHaveBeenCalledWith('request_duration', 3, expect.arrayContaining(tags))
  expect(histogramSpy).toHaveBeenCalledWith('response_size', 52, expect.arrayContaining(tags))
  expect(incrementSpy).toHaveBeenCalledWith('error', 1, expect.arrayContaining(tags))
})

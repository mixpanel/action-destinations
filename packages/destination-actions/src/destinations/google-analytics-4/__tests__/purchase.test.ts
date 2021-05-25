import nock from 'nock'
import { createTestEvent, createTestIntegration } from '@segment/actions-core'
import ga4 from '../index'

const testDestination = createTestIntegration(ga4)
const apiSecret = 'b287432uhkjHIUEL'
const measurementId = 'G-TESTTOKEN'

describe('GA4', () => {
  describe('Purchase', () => {
    it('should handle basic mapping overrides', async () => {
      nock('https://www.google-analytics.com/mp/collect')
        .post(`?measurement_id=${measurementId}&api_secret=${apiSecret}`)
        .reply(201, {})
      const event = createTestEvent({
        event: 'Order Completed',
        userId: '3456fff',
        anonymousId: 'anon-567890',
        type: 'track',
        properties: {
          order_id: '5678dd9087-78',
          coupon: 'SUMMER_FEST',
          currency: 'USD',
          revenue: 11.99,
          total: 15.99
        }
      })
      const responses = await testDestination.testAction('purchase', {
        event,
        settings: {
          apiSecret,
          measurementId
        },
        mapping: {
          clientId: {
            '@path': '$.anonymousId'
          },
          coupon: {
            '@path': '$.properties.coupon'
          },
          currency: {
            '@path': '$.properties.currency'
          },
          orderId: {
            '@path': '$.properties.order_id'
          },
          total: {
            '@path': '$.properties.revenue'
          }
        },
        useDefaultMappings: false
      })

      expect(responses.length).toBe(1)
      expect(responses[0].status).toBe(201)

      expect(responses[0].request.headers).toMatchInlineSnapshot(`
        Headers {
          Symbol(map): Object {
            "content-type": Array [
              "application/json",
            ],
            "user-agent": Array [
              "Segment",
            ],
          },
        }
      `)

      expect(responses[0].options.body).toMatchInlineSnapshot(
        `"{\\"client_id\\":\\"anon-567890\\",\\"events\\":[{\\"name\\":\\"purchase\\",\\"params\\":{\\"coupon\\":\\"SUMMER_FEST\\",\\"currency\\":\\"USD\\",\\"items\\":[],\\"transaction_id\\":\\"5678dd9087-78\\",\\"value\\":11.99}}]}"`
      )
    })

    it('should throw an error for invalid currency values', async () => {
      nock('https://www.google-analytics.com/mp/collect')
        .post(`?measurement_id=${measurementId}&api_secret=${apiSecret}`)
        .reply(201, {})
      const event = createTestEvent({
        event: 'Order Completed',
        userId: '3456fff',
        type: 'track',
        properties: {
          order_id: '5678dd9087-78',
          coupon: 'SUMMER_FEST',
          currency: '1234'
        }
      })
      try {
        await testDestination.testAction('purchase', {
          event,
          settings: {
            apiSecret,
            measurementId
          },
          mapping: {
            clientId: {
              '@path': '$.userId'
            },
            coupon: {
              '@path': '$.properties.coupon'
            },
            currency: {
              '@path': '$.properties.currency'
            },
            orderId: {
              '@path': '$.properties.order_id'
            }
          },
          useDefaultMappings: true
        })
        fail('the test should have thrown an error')
      } catch (e) {
        expect(e.message).toBe('1234 is not a valid currency code.')
      }
    })

    it('should handle default mappings', async () => {
      nock('https://www.google-analytics.com/mp/collect')
        .post(`?measurement_id=${measurementId}&api_secret=${apiSecret}`)
        .reply(201, {})
      const event = createTestEvent({
        event: 'Order Completed',
        userId: '3456fff',
        anonymousId: 'anon-567890',
        type: 'track',
        properties: {
          affiliation: 'TI Online Store',
          order_id: '5678dd9087-78',
          coupon: 'SUMMER_FEST',
          currency: 'EUR',
          products: [
            {
              product_id: 'pid-123456',
              sku: 'SKU-123456',
              name: 'Tour t-shirt',
              quantity: 2,
              coupon: 'MOUNTAIN',
              brand: 'Canvas',
              category: 'T-Shirt',
              variant: 'Black',
              price: 19.98
            }
          ],
          revenue: 5.99,
          shipping: 1.5,
          tax: 3.0,
          total: 24.48
        }
      })
      const responses = await testDestination.testAction('purchase', {
        event,
        settings: {
          apiSecret,
          measurementId
        },
        useDefaultMappings: true
      })

      expect(responses.length).toBe(1)
      expect(responses[0].status).toBe(201)

      expect(responses[0].request.headers).toMatchInlineSnapshot(`
          Headers {
            Symbol(map): Object {
              "content-type": Array [
                "application/json",
              ],
              "user-agent": Array [
                "Segment",
              ],
            },
          }
        `)

      expect(responses[0].options.body).toMatchInlineSnapshot(
        `"{\\"client_id\\":\\"3456fff\\",\\"events\\":[{\\"name\\":\\"purchase\\",\\"params\\":{\\"affiliation\\":\\"TI Online Store\\",\\"coupon\\":\\"SUMMER_FEST\\",\\"currency\\":\\"EUR\\",\\"items\\":[{\\"item_id\\":\\"pid-123456\\",\\"item_name\\":\\"Tour t-shirt\\",\\"coupon\\":\\"MOUNTAIN\\",\\"affiliation\\":\\"TI Online Store\\",\\"item_brand\\":\\"Canvas\\",\\"item_category\\":\\"T-Shirt\\",\\"item_variant\\":\\"Black\\",\\"price\\":19.98,\\"currency\\":\\"EUR\\",\\"quantity\\":2}],\\"transaction_id\\":\\"5678dd9087-78\\",\\"shipping\\":1.5,\\"value\\":24.48,\\"tax\\":3}}]}"`
      )
    })
  })
})

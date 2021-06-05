import nock from 'nock'
import { createTestEvent, createTestIntegration } from '@segment/actions-core'
import ga4 from '../index'

const testDestination = createTestIntegration(ga4)
const apiSecret = 'b287432uhkjHIUEL'
const measurementId = 'G-TESTTOKEN'

describe('GA4', () => {
  describe('Select Promotion', () => {
    it('should handle basic mapping overrides', async () => {
      nock('https://www.google-analytics.com/mp/collect')
        .post(`?measurement_id=${measurementId}&api_secret=${apiSecret}`)
        .reply(201, {})
      const event = createTestEvent({
        event: 'Promotion Clicked',
        userId: '3456fff',
        anonymousId: 'anon-567890',
        type: 'track',
        properties: {
          promotion_id: 'promo_1',
          creative: 'top_banner_2',
          name: '75% store-wide shoe sale',
          position: 'home_banner_top'
        }
      })
      const responses = await testDestination.testAction('selectPromotion', {
        event,
        settings: {
          apiSecret,
          measurementId
        },
        mapping: {
          clientId: {
            '@path': '$.anonymousId'
          },
          location_id: {
            '@path': '$.properties.promotion_id'
          }
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
        `"{\\"client_id\\":\\"3456fff\\",\\"events\\":[{\\"name\\":\\"select_promotion\\",\\"params\\":{\\"location_id\\":\\"promo_1\\"}}]}"`
      )
    })

    it('should handle complete mapping', async () => {
      nock('https://www.google-analytics.com/mp/collect')
        .post(`?measurement_id=${measurementId}&api_secret=${apiSecret}`)
        .reply(201, {})
      const event = createTestEvent({
        event: 'Promotion Clicked',
        userId: '3456fff',
        anonymousId: 'anon-567890',
        type: 'track',
        properties: {
          promotion_id: 'promo_1',
          creative: 'top_banner_2',
          name: '75% store-wide shoe sale',
          position: 'home_banner_top',
          items: [
            {
              item_id: 'SKU_12345',
              item_name: 'jeggings',
              coupon: 'SUMMER_FUN',
              discount: 2.22,
              promotion_id: 'P_12345',
              promotion_name: 'Summer Sale',
              creative_slot: 'featured_app_1',
              location_id: 'L_12345',
              affiliation: 'Google Store',
              item_brand: 'Gucci',
              item_category: 'pants',
              item_variant: 'Black',
              price: 9.99,
              currency: 'USD'
            }
          ]
        }
      })
      const responses = await testDestination.testAction('selectPromotion', {
        event,
        settings: {
          apiSecret,
          measurementId
        },
        mapping: {
          clientId: {
            '@path': '$.anonymousId'
          },
          location_id: {
            '@path': '$.properties.promotion_id'
          },
          promotion_id: {
            '@path': '$.properties.promotion_id'
          },
          promotion_name: {
            '@path': '$.properties.promotion_id'
          },
          creative_name: {
            '@path': '$.properties.name'
          },
          creative_slot: {
            '@path': '$.properties.creative'
          },
          items: {
            '@path': '$.properties.items'
          }
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
        `"{\\"client_id\\":\\"3456fff\\",\\"events\\":[{\\"name\\":\\"select_promotion\\",\\"params\\":{\\"location_id\\":\\"promo_1\\",\\"promotion_id\\":\\"promo_1\\",\\"promotion_name\\":\\"promo_1\\",\\"creative_name\\":\\"75% store-wide shoe sale\\",\\"creative_slot\\":\\"top_banner_2\\",\\"items\\":[{\\"item_id\\":\\"SKU_12345\\",\\"item_name\\":\\"jeggings\\",\\"coupon\\":\\"SUMMER_FUN\\",\\"discount\\":2.22,\\"location_id\\":\\"L_12345\\",\\"affiliation\\":\\"Google Store\\",\\"item_brand\\":\\"Gucci\\",\\"item_category\\":\\"pants\\",\\"item_variant\\":\\"Black\\",\\"price\\":9.99,\\"currency\\":\\"USD\\"}]}}]}"`
      )
    })
  })
})

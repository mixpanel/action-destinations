import nock from 'nock'
import { createSegmentEvent } from '@/../test/create-segment-event'
import { createTestDestination } from '@/../test/create-test-destination'
import Amplitude from '../index'

const testDestination = createTestDestination(Amplitude)
const timestamp = new Date().toISOString()

describe('Amplitude', () => {
  describe('trackUser', () => {
    it('should work with default mappings', async () => {
      const event = createSegmentEvent({ timestamp, event: 'Test Event' })

      nock('https://api2.amplitude.com/2').post('/httpapi').reply(200, {})

      const responses = await testDestination.testAction('trackUser', { event })
      expect(responses.length).toBe(1)
      expect(responses[0].statusCode).toBe(200)
      expect(responses[0].body).toBe('{}')
      expect(responses[0].request.options.json).toMatchObject({
        api_key: undefined,
        events: expect.arrayContaining([
          expect.objectContaining({
            event_type: 'Test Event',
            city: 'San Francisco',
            country: 'United States'
          })
        ])
      })
    })
  })

  describe('orderCompleted', () => {
    it('should work with default mappings', async () => {
      const event = createSegmentEvent({
        event: 'Order Completed',
        timestamp,
        properties: {
          revenue: 1_999,
          products: [
            {
              quantity: 1,
              productId: 'Bowflex Treadmill 10',
              price: 1_999
            }
          ]
        }
      })

      nock('https://api2.amplitude.com/2').post('/httpapi').reply(200, {})

      const responses = await testDestination.testAction('orderCompleted', { event })
      expect(responses.length).toBe(1)
      expect(responses[0].statusCode).toBe(200)
      expect(responses[0].request.options.json).toMatchObject({
        api_key: undefined,
        events: expect.arrayContaining([
          expect.objectContaining({
            event_type: 'Order Completed',
            revenue: 1_999,
            event_properties: event.properties
          }),
          expect.objectContaining({
            event_type: 'Product Purchased',
            // @ts-ignore i know what i'm doing
            event_properties: event.properties.products[0]
          })
        ])
      })
    })

    it('should work with per product revenue tracking', async () => {
      nock('https://api2.amplitude.com/2').post('/httpapi').reply(200, {})

      const event = createSegmentEvent({
        event: 'Order Completed',
        timestamp,
        properties: {
          revenue: 1_999,
          products: [
            {
              quantity: 1,
              productId: 'Bowflex Treadmill 10',
              revenue: 1_999
            }
          ]
        }
      })

      const mapping = {
        trackRevenuePerProduct: true
      }

      const responses = await testDestination.testAction('orderCompleted', { event, mapping })
      expect(responses.length).toBe(1)
      expect(responses[0].statusCode).toBe(200)
      expect(responses[0].request.options.json).toMatchObject({
        api_key: undefined,
        events: expect.arrayContaining([
          expect.objectContaining({
            event_type: 'Order Completed',
            event_properties: event.properties
          }),
          expect.objectContaining({
            event_type: 'Product Purchased',
            revenue: 1_999,
            // @ts-ignore i know what i'm doing
            event_properties: event.properties.products[0]
          })
        ])
      })
    })
  })
})

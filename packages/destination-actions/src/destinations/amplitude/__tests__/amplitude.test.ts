import nock from 'nock'
import { createTestEvent, createTestIntegration } from '@segment/actions-core'
import Amplitude from '../index'
import dayjs from '../../../lib/dayjs'

const testDestination = createTestIntegration(Amplitude)
const timestamp = new Date().toISOString()

describe('Amplitude', () => {
  describe('logEvent', () => {
    it('should work with default mappings', async () => {
      const event = createTestEvent({ timestamp, event: 'Test Event' })

      nock('https://api2.amplitude.com/2').post('/httpapi').reply(200, {})

      const responses = await testDestination.testAction('logEvent', { event, useDefaultMappings: true })
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

    it('should accept null for user_id', async () => {
      const event = createTestEvent({ timestamp, userId: null, event: 'Null User' })

      nock('https://api2.amplitude.com/2').post('/httpapi').reply(200, {})

      const responses = await testDestination.testAction('logEvent', { event, useDefaultMappings: true })
      expect(responses.length).toBe(1)
      expect(responses[0].statusCode).toBe(200)
      expect(responses[0].body).toBe('{}')
      expect(responses[0].request.options.json).toMatchObject({
        api_key: undefined,
        events: expect.arrayContaining([
          expect.objectContaining({
            event_type: 'Null User',
            user_id: null
          })
        ])
      })
    })
  })

  describe('orderCompleted', () => {
    it('should work with default mappings', async () => {
      const event = createTestEvent({
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

      const responses = await testDestination.testAction('orderCompleted', { event, useDefaultMappings: true })
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

      const event = createTestEvent({
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

      const responses = await testDestination.testAction('orderCompleted', { event, mapping, useDefaultMappings: true })
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

  describe('mapUser', () => {
    it('should work with default mappings', async () => {
      const event = createTestEvent({
        type: 'alias',
        userId: 'some-user-id',
        previousId: 'some-previous-user-id'
      })

      nock('https://api.amplitude.com').post('/usermap').reply(200, {})

      const responses = await testDestination.testAction('mapUser', { event, useDefaultMappings: true })
      expect(responses.length).toBe(1)
      expect(responses[0].statusCode).toBe(200)
      expect(responses[0].body).toBe('{}')
      expect(responses[0].request.options.form).toMatchObject({
        api_key: undefined,
        mapping: JSON.stringify([
          {
            user_id: event.previousId,
            global_user_id: event.userId
          }
        ])
      })
    })
  })

  describe('groupIdentifyUser', () => {
    const event = createTestEvent({
      timestamp,
      type: 'group',
      userId: 'some-user-id',
      traits: {
        'some-trait-key': 'some-trait-value'
      }
    })

    const mapping = {
      insert_id: 'some-insert-id',
      group_type: 'some-type',
      group_value: 'some-value'
    }

    const groups = {
      [mapping.group_type]: mapping.group_value
    }

    it('should fire identify call to Amplitude', async () => {
      nock('https://api.amplitude.com').post('/identify').reply(200, {})
      nock('https://api.amplitude.com').post('/groupidentify').reply(200, {})

      const [response] = await testDestination.testAction('groupIdentifyUser', {
        event,
        mapping,
        useDefaultMappings: true
      })

      expect(response.statusCode).toBe(200)
      expect(response.body).toBe('{}')
      expect(response.request.options.form).toMatchObject({
        api_key: undefined,
        identification: JSON.stringify([
          {
            device_id: event.anonymousId,
            groups,
            insert_id: mapping.insert_id,
            library: 'segment',
            time: dayjs.utc(timestamp).valueOf(),
            user_id: event.userId,
            user_properties: groups
          }
        ])
      })
    })

    it('should fire groupidentify call to Amplitude', async () => {
      nock('https://api.amplitude.com').post('/identify').reply(200, {})
      nock('https://api.amplitude.com').post('/groupidentify').reply(200, {})

      const [, response] = await testDestination.testAction('groupIdentifyUser', {
        event,
        mapping,
        useDefaultMappings: true
      })

      expect(response.statusCode).toBe(200)
      expect(response.body).toBe('{}')
      expect(response.request.options.form).toMatchObject({
        api_key: undefined,
        identification: JSON.stringify([
          {
            group_properties: {
              'some-trait-key': 'some-trait-value'
            },
            group_value: mapping.group_value,
            group_type: mapping.group_type,
            library: 'segment'
          }
        ])
      })
    })
  })
})

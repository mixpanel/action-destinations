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
})

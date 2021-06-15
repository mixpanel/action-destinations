import { Destination, DestinationDefinition } from '../destination-kit'
import { JSONObject } from '../json-object'
import { SegmentEvent } from '../segment-event'

const destination: DestinationDefinition<JSONObject> = {
  name: 'Google Analytics 4',
  authentication: {
    scheme: 'custom',
    fields: {
      apiSecret: {
        label: 'API secret',
        description: 'Api key',
        type: 'string',
        required: true
      }
    },
    testAuthentication: (_request) => {
      return true
    }
  },
  actions: {
    customEvent: {
      title: 'Send a Custom Event',
      description: 'Send events to a custom event in API',
      defaultSubscription: 'type = "track"',
      fields: {},
      perform: (_request) => {
        return 'this is a test'
      }
    }
  }
}

describe('destination kit event validations', () => {
  test('should return `invalid subscription` when sending an empty subscribe', async () => {
    const destinationTest = new Destination(destination)
    const testEvent: SegmentEvent = { type: 'track' }
    const testSettings = { subscription: { subscribe: '', partnerAction: 'customEvent' } }
    const res = await destinationTest.onEvent(testEvent, testSettings)
    expect(res).toEqual([{ output: 'invalid subscription' }])
  })

  test('should succeed if provided with a valid event & settings', async () => {
    const destinationTest = new Destination(destination)
    const testEvent: SegmentEvent = {
      properties: { field_one: 'test input' },
      userId: '3456fff',
      type: 'track'
    }
    const testSettings = {
      apiSecret: 'test_key',
      subscription: {
        subscribe: 'type = "track"',
        partnerAction: 'customEvent',
        mapping: {
          clientId: '23455343467',
          name: 'fancy_event',
          parameters: { field_one: 'rogue one' }
        }
      }
    }

    const res = await destinationTest.onEvent(testEvent, testSettings)
    expect(res).toEqual([
      { output: 'MapInput completed', error: null },
      { output: 'Validate completed', error: null },
      { output: 'this is a test', error: null }
    ])
  })
})

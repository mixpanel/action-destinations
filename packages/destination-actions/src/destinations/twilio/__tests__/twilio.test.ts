import nock from 'nock'
import { createSegmentEvent } from '../../../../test/create-segment-event'
import { createTestDestination } from '../../../../test/create-test-destination'
import Twilio from '../index'

const testDestination = createTestDestination(Twilio)
const timestamp = new Date().toISOString()
const accountId = '_account_'

describe('Twilio', () => {
  describe('trackUser', () => {
    it('should work with default mappings', async () => {
      const event = createSegmentEvent({
        timestamp,
        event: 'Test Event',
        properties: {
          To: '+17758638863',
          Body: 'Hello, World!'
        }
      })

      nock(`https://api.twilio.com/2010-04-01/Accounts/${accountId}`).post('/Messages.json').reply(201, {})

      const responses = await testDestination.testAction('sendSMS', {
        event,
        settings: {
          accountId,
          phoneNumber: '+12056065576',
          token: '_token_'
        },
        mapping: {
          To: {
            '@path': '$.properties.To'
          },
          Body: {
            '@path': '$.properties.Body'
          }
        },
        useDefaultMappings: true
      })

      expect(responses.length).toBe(1)
      expect(responses[0].statusCode).toBe(201)

      expect(responses[0].request.options.form).toMatchInlineSnapshot(`
        Object {
          "Body": "Hello, World!",
          "From": "+12056065576",
          "To": "+17758638863",
        }
      `)

      expect(responses[0].request.options.headers).toMatchInlineSnapshot(`
        Object {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "user-agent": "Segment",
        }
      `)

      expect(responses[0].request.options.username).toMatchInlineSnapshot(`"_account_"`)
      expect(responses[0].request.options.password).toMatchInlineSnapshot(`"_token_"`)
    })
  })
})

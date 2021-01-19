import nock from 'nock'
import { createTestDestination } from '@/../test/create-test-destination'
import SendGrid from '../index'
import type { Settings } from '../generated-types'

const testDestination = createTestDestination(SendGrid)

const SENDGRID_API_KEY = 'lJZeH9O1LWYiPJEh5U3Pw7bU2JXcYWBD'

const settings: Settings = {
  apiKey: SENDGRID_API_KEY
}

describe('SendGrid', () => {
  describe('authentication', () => {
    it('should validate api keys', async () => {
      const settings = { apiKey: 'secret' }

      try {
        await testDestination.testAuthentication(settings)
      } catch (err) {
        expect(err.message).toContain('API Key should be 32 characters')
      }
    })

    it('should test that authentication works', async () => {
      nock('https://api.sendgrid.com/v3')
        .get('/user/profile')
        .matchHeader('authorization', `Bearer ${settings.apiKey}`)
        .reply(200, {})

      await expect(testDestination.testAuthentication(settings)).resolves.not.toThrow()
    })

    it('should test that authentication fails', async () => {
      nock('https://api.sendgrid.com/v3')
        .get('/user/profile')
        .reply(403, {
          errors: [
            {
              field: null,
              message: 'access forbidden'
            }
          ]
        })

      const invalidSettings: Settings = {
        apiKey: `nope ${SENDGRID_API_KEY}`
      }

      try {
        await testDestination.testAuthentication(invalidSettings)
      } catch (err) {
        expect(err.message).toContain('Credentials are invalid')
      }
    })
  })

  describe('createList', () => {
    it('should validate action fields', async () => {
      try {
        await testDestination.testAction('createList', {
          settings,
          skipDefaultMappings: true
        })
      } catch (err) {
        expect(err.message).toContain("missing the required field 'name'.")
      }
    })

    it('should work', async () => {
      nock('https://api.sendgrid.com/v3')
        .post('/marketing/lists', {
          name: 'Some Name'
        })
        .reply(200)

      const input = {
        mapping: {
          name: 'Some Name'
        },
        settings
      }

      await testDestination.testAction('createList', input)
    })
  })

  describe('createUpdateContact', () => {
    it('should validate action fields', async () => {
      try {
        await testDestination.testAction('createUpdateContact', {
          settings,
          skipDefaultMappings: true
        })
      } catch (err) {
        expect(err.message).toContain("missing the required field 'email'.")
        expect(err.message).toContain("missing the required field 'list_id'.")
      }
    })
  })

  describe('removeContactFromList', () => {
    it('should validate action fields', async () => {
      try {
        await testDestination.testAction('removeContactFromList', {
          settings,
          skipDefaultMappings: true
        })
      } catch (err) {
        expect(err.message).toContain("missing the required field 'email'.")
        expect(err.message).toContain("missing the required field 'list_id'.")
      }
    })
  })
})

import type { DestinationDefinition } from '@segment/actions-core'
import type { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: 'Foo',
  authentication: {
    scheme: 'basic',
    fields: {
      username: {
        title: 'Username',
        description: 'Your Foo username',
        type: 'string',
        required: true
      },
      password: {
        title: 'password',
        description: 'Your Foo password.',
        type: 'string',
        required: true
      }
    },
    testAuthentication: (_request) => {
      // Return a request that tests/validates the user's credentials here
    }
  },
  extendRequest({ settings }) {
    return {
      username: settings.username,
      password: settings.password
    }
  },
  actions: {}
}

export default destination

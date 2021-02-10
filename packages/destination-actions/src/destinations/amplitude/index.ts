import { DestinationDefinition } from '../../lib/destination-kit'
import identifyUser from './identifyUser'
import trackUser from './trackUser'
import orderCompleted from './orderCompleted'
import mapUser from './mapUser'
import groupIdentifyUser from './groupIdentifyUser'
import type { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: 'Amplitude',
  authentication: {
    scheme: 'custom',
    fields: {
      apiKey: {
        title: 'API Key',
        description: 'Amplitude project API key. You can find this key in the "General" tab of your Amplitude project.',
        type: 'string',
        required: true
      },
      secretKey: {
        title: 'Secret Key',
        description:
          'Amplitude project secret key. You can find this key in the "General" tab of your Amplitude project.',
        type: 'string',
        required: true
      }
    },
    testAuthentication: (req, { settings }) => {
      // Note: Amplitude has some apis that use basic auth (like this one)
      // and others that use custom auth in the request body
      return req('https://amplitude.com/api/2/usersearch?user=testUser@example.com', {
        username: settings.apiKey,
        password: settings.secretKey
      })
    }
  },
  actions: {
    trackUser,
    identifyUser,
    orderCompleted,
    mapUser,
    groupIdentifyUser
  }
}

export default destination

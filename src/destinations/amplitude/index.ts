import { DestinationDefinition } from '../../lib/destination-kit'
import trackUser from './trackUser'
import identifyUser from './identifyUser'
import { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: 'Amplitude',
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    properties: {
      apiKey: {
        title: 'API Key',
        description: 'Amplitude project API key. You can find this key in the "General" tab of your Amplitude project.',
        type: 'string'
      },
      secretKey: {
        title: 'Secret Key',
        description:
          'Amplitude project secret key. You can find this key in the "General" tab of your Amplitude project.',
        type: 'string'
      }
    },
    additionalProperties: false,
    required: ['apiKey', 'secretKey']
  },
  actions: {
    trackUser,
    identifyUser
  }
}

export default destination

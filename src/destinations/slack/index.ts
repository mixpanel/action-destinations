import { DestinationDefinition } from '../../lib/destination-kit'
import { Settings } from './generated-types'
import postToChannel from './postToChannel'

const destination: DestinationDefinition<Settings> = {
  name: 'Slack',
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
    required: []
  },
  actions: {
    postToChannel
  }
}

export default destination

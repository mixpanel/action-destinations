import { ActionDefinition } from '@/lib/destination-kit/action'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Create Contact List',
  description: 'Create a marketing contact list.',
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    properties: {
      name: {
        title: 'Name',
        description: 'Name of the list to be created.',
        type: 'string'
      }
    },
    required: ['name']
  },

  perform: (request, { payload }) => {
    return request.post('marketing/lists', {
      json: payload
    })
  }
}

export default action

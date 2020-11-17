import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { CreateContactList } from './generated-types'

const action: ActionDefinition<Settings, CreateContactList> = {
  schema: {
    $schema: 'http://json-schema.org/schema#',
    title: 'Create Contact List',
    description: 'Create a marketing contact list.',
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

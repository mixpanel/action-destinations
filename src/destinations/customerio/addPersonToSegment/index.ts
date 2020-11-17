import segmentIdAutocomplete from '../autocomplete/segment_id'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { AddPersonToSegment } from './generated-types'

const definition: ActionDefinition<Settings, AddPersonToSegment> = {
  schema: {
    $schema: 'http://json-schema.org/schema#',
    title: 'Add Person to Segment',
    description: 'Add a person to a segment in Customer.io.',
    type: 'object',
    additionalProperties: false,
    properties: {
      segment_id: {
        title: 'Segment ID',
        description: 'ID of the Customer.io segment to add the person to.',
        type: 'number',
        autocomplete: true
      },
      person_id: {
        title: 'Person ID',
        description: 'ID of the person to add.',
        type: 'string',
        defaultMapping: {
          '@template': '{{userId}}'
        }
      }
    },
    required: ['segment_id', 'person_id']
  },

  autocompleteFields: {
    segment_id: segmentIdAutocomplete
  },

  perform: (req, { payload }) => {
    const { segment_id: segmentId, person_id: personId } = payload

    return req.post(`segments/${segmentId}/add_customers`, {
      json: {
        ids: [personId]
      }
    })
  }
}

export default definition

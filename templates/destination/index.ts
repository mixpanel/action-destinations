import { DestinationDefinition } from '@/lib/destination-kit'
import { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: '{{name}}',
  schema: {
    "$schema": "http://json-schema.org/schema#",
    "type": "object",
    "additionalProperties": false,
    "properties": {},
    "required": []
  },
  actions: {}
}

export default destination

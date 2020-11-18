import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: '{{name}}',
  description: '{{description}}',
  schema: {
    "$schema": "http://json-schema.org/schema#",
    "type": "object",
    "additionalProperties": false,
    "properties": {},
    "required": []
  },
  perform: (_request, _data) => {
    // Make your partner api request here!
  }
}

export default action

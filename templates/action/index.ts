import { ActionDefinition } from '@/lib/destination-kit/action'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

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

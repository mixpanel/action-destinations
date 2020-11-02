import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { {{typeName}} } from './generated-types'

export default function(action: Action<Settings, {{typeName}}>): Action<Settings, {{typeName}}> {
  return action
    .validatePayload(payloadSchema)
    .request((req, { payload, settings }) => {
      // Make your partner api request here!
    })
}

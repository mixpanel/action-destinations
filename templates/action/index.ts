import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import schema from './payload.schema.json'
import { {{typeName}} } from './generated-types'

const action: ActionDefinition<Settings, {{typeName}}> = {
  title: '{{name}}',
  description: '{{description}}',
  schema,
  perform: (request, { payload }) => {
    // Make your partner api request here!
  }
}

export default action

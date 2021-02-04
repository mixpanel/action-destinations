import { DestinationDefinition } from '../../lib/destination-kit'
import type { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: '{{name}}',
  authentication: {},
  actions: {}
}

export default destination

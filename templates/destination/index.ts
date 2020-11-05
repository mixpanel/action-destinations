import { JSONSchema7 } from 'json-schema'
import { DestinationDefinition } from '../../lib/destination-kit'
import { Settings } from './generated-types'
import settings from './settings.schema.json'

const destination: DestinationDefinition<Settings> = {
  name: '{{name}}',
  schema: settings as JSONSchema7
}

export default destination

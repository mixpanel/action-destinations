import { JSONSchema7 } from 'json-schema'
import { DestinationDefinition } from '../../lib/destination-kit'
import settings from './settings.schema.json'
import trackUser from './trackUser'
import identifyUser from './identifyUser'
import deleteUser from './deleteUser'
import { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: 'Amplitude',
  schema: settings as JSONSchema7,
  actions: {
    trackUser,
    identifyUser,
    deleteUser
  }
}

export default destination

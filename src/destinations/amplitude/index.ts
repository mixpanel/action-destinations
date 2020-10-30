import { JSONSchema7 } from 'json-schema'
import { Destination } from '../../lib/destination-kit'

import settings from './settings.schema.json'
import trackUser from './trackUser'
import identifyUser from './identifyUser'
import deleteUser from './deleteUser'
import { Settings } from './generated-types'

export default function createDestination(): Destination<Settings> {
  const destination = new Destination<Settings>({
    name: 'Amplitude',
    // TODO get this from the database
    schema: settings as JSONSchema7
  })

  destination.partnerAction('trackUser', trackUser)
  destination.partnerAction('identifyUser', identifyUser)
  destination.partnerAction('deleteUser', deleteUser)

  return destination
}

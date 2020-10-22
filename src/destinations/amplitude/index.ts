import { Destination } from '../../lib/destination-kit'

import config from './destination.json'
import settings from './settings.schema.json'
import trackUser from './trackUser'
import identifyUser from './identifyUser'
import annotateChart from './annotateChart'
import deleteUser from './deleteUser'
import { Settings } from './generated-types'

export default function createDestination(): Destination<Settings> {
  const destination = new Destination<Settings>(config)
    .validateSettings(settings)
    .partnerAction('trackUser', trackUser)
    .partnerAction('identifyUser', identifyUser)
    .partnerAction('annotateChart', annotateChart)
    .partnerAction('deleteUser', deleteUser)

  return destination
}

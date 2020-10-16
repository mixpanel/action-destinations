import { Destination } from '../../lib/destination-kit'

import config from './destination.json'
import settings from './settings.schema.json'
import trackUser from './trackUser'
import identifyUser from './identifyUser'
import annotateChart from './annotateChart'
import deleteUser from './deleteUser'

export default function createDestination(): Destination {
  const destination = new Destination(config)
    .validateSettings(settings)
    .partnerAction('trackUser', trackUser)
    .partnerAction('identifyUser', identifyUser)
    .partnerAction('annotateChart', annotateChart)
    .partnerAction('deleteUser', deleteUser)

  return destination
}

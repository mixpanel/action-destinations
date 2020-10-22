import { Destination } from '../../lib/destination-kit'

import config from './destination.json'
import settings from './settings.schema.json'
import createRecord from './createRecord'
import { Settings } from './generated-types'

export default function createDestination(): Destination<Settings> {
  const destination = new Destination<Settings>(config)
    .validateSettings(settings)

    .extendRequest(({ settings }) => {
      return {
        headers: {
          'User-Agent': 'Segment/2.0',
          Authorization: `Bearer ${settings.apiKey}`
        },
        responseType: 'json'
      }
    })

    .partnerAction('createRecord', createRecord)

  return destination
}

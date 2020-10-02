import { Destination } from '../../lib/destination-kit'

import config from './destination.json'
import settings from './settings.schema.json'
import createRecord from './createRecord'

const destination = new Destination(config)
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

export default destination

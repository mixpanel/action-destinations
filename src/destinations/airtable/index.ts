import { JSONSchema7 } from 'json-schema'
import { DestinationDefinition } from '../../lib/destination-kit'

import settings from './settings.schema.json'
import createRecord from './createRecord'
import { Settings } from './generated-types'

const destination: DestinationDefinition<Settings> = {
  name: 'Airtable',
  schema: settings as JSONSchema7,
  extendRequest({ settings }) {
    return {
      headers: {
        'User-Agent': 'Segment/2.0',
        Authorization: `Bearer ${settings.apiKey}`
      },
      responseType: 'json'
    }
  },

  actions: {
    createRecord
  }
}

export default destination

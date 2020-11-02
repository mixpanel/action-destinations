import { JSONSchema7 } from 'json-schema'
import { Destination } from '../../lib/destination-kit'

import settings from './settings.schema.json'
import createRecord from './createRecord'
import { Settings } from './generated-types'

export default function createDestination(): Destination<Settings> {
  const destination = new Destination<Settings>({
    name: 'Airtable',
    // TODO get this from the database
    schema: settings as JSONSchema7,
    extendRequest({ settings }) {
      return {
        headers: {
          'User-Agent': 'Segment/2.0',
          // TODO: this should be handled automagically by the authentication config
          Authorization: `Bearer ${settings.apiKey}`
        },
        responseType: 'json'
      }
    },

    actions: {
      createRecord
    }
  })

  return destination
}

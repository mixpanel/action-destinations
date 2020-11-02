import { JSONSchema7 } from 'json-schema'
import { Destination } from '@/lib/destination-kit'

import settings from './settings.schema.json'
import { Settings } from './generated-types'

export default function createDestination(): Destination<Settings> {
  const destination = new Destination<Settings>({
    name: '{{name}}',
    schema: settings as JSONSchema7
  })

  return destination
}

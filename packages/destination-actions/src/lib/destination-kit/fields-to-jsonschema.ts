import { JSONSchema4 } from 'json-schema'
import { mapValues, pickBy, omit } from 'lodash'
import type { InputField } from './types'

export function fieldsToJsonSchema(fields: Record<string, InputField> = {}): JSONSchema4 {
  return {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    // Remove the `required` property from fields because it'll get lifted up into an array of required keys
    properties: mapValues(fields, (field: InputField) => omit(field, 'required')),
    // Grab all the field keys with `required: true`
    required: Object.keys(pickBy(fields, (field) => field.required))
  }
}

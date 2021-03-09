import { JSONSchema4 } from 'json-schema'
import type { InputField } from './types'

export function fieldsToJsonSchema(fields: Record<string, InputField> = {}): JSONSchema4 {
  const required: string[] = []
  const properties: Record<string, JSONSchema4> = {}

  for (const key of Object.keys(fields)) {
    const field = fields[key]

    // Remove the `required` property from fields because it'll get lifted up into an array of required keys
    properties[key] = Object.assign({}, field) as JSONSchema4
    delete properties[key].required

    // Grab all the field keys with `required: true`
    if (field.required) {
      required.push(key)
    }
  }

  return {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    properties,
    required
  }
}

export function jsonSchemaToFields(schema: JSONSchema4 = {}): Record<string, InputField> {
  const requiredFields = (schema.required as string[]) ?? []
  const properties = (schema.properties as Record<string, InputField>) ?? {}

  for (const key of Object.keys(properties)) {
    if (requiredFields.includes(key)) {
      properties[key].required = true
    }
  }

  return properties
}

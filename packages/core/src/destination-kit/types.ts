import type { RequestOptions } from '../request-client'
import type { JSONSchema4 } from 'json-schema'
import type { ExecuteInput } from './step'

export interface AutocompleteResponse {
  body: {
    data: AutocompleteItem[]
    pagination: {
      nextPage?: string
    }
  }
}

export interface AutocompleteItem {
  label: string
  value: string
}

// TODO evaluate using JSON Schema at all
export interface InputField extends Omit<JSONSchema4, 'required'> {
  required?: boolean
}

/**
 * A function to configure a request client instance with options
 * that will be applied to every request made by that instance
 */
export type RequestExtension<Settings, Payload = unknown> = (data: ExecuteInput<Settings, Payload>) => RequestOptions

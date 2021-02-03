import { Options } from 'got'
import { JSONSchema4 } from 'json-schema'
import { ExecuteInput } from './step'

// TODO evaluate using JSONSchema at all
export interface InputField extends Omit<JSONSchema4, 'required'> {
  required?: boolean
}

/**
 * The supported request options you can use to extend the instance of our `request`
 */
export interface RequestOptions {
  headers?: Options['headers']
  method?: Options['method']
  username?: Options['username']
  password?: Options['password']
  // TODO consider removing prefix urls
  // it is much more explicit to have complete urls
  // especially since the destination definition is slightly separate from the action code
  prefixUrl?: Options['prefixUrl']
  responseType?: Options['responseType']
  searchParams?: Options['searchParams']
}

/**
 * A function to configure a request client instance with options
 * that will be applied to every request made by that instance
 */
export type RequestExtension<Settings, Payload = unknown> = (data: ExecuteInput<Settings, Payload>) => RequestOptions

/**
 * A set of request extensions to apply to a request client instance
 */
export type RequestExtensions<Settings, Payload = unknown> = RequestExtension<Settings, Payload>[]

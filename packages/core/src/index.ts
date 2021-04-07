export { Destination, fieldsToJsonSchema, jsonSchemaToFields } from './destination-kit'
export { transform } from './mapping-kit'
export { defaultValues } from './defaults'
export { get } from './get'
export { omit } from './omit'
export { removeUndefined } from './remove-undefined'
export { time, duration } from './time'

export { realTypeOf, isObject, isArray, isString } from './real-type-of'

export type {
  ActionDefinition,
  DestinationDefinition,
  ExecuteInput,
  Subscription,
  SubscriptionStats,
  AuthenticationScheme,
  BasicAuthentication,
  CustomAuthentication
} from './destination-kit'

export type {
  AutocompleteResponse,
  AutocompleteItem,
  InputField,
  RequestOptions,
  RequestExtension,
  RequestExtensions
} from './destination-kit/types'

export type { JSONPrimitive, JSONValue, JSONObject, JSONArray, JSONLike, JSONLikeObject } from './json-object'

export type { SegmentEvent } from './segment-event'

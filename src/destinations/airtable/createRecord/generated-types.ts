// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * Base-specific API URL that records will be sent to.
 */
export type BaseURL = string

/**
 * Create a new record in Airtable base.
 */
export interface CreateRecord {
  url: BaseURL
  fields: Fields
}
/**
 * Object with record's fields.
 */
export interface Fields {
  [k: string]: unknown
}

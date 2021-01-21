// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * ID used to uniquely identify person in Customer.io.
 */
export type PersonID = string
/**
 * Person's email address.
 */
export type EmailAddress = string
/**
 * Timestamp for when the person was created. Default is current date and time.
 */
export type CreatedAt = string

export interface Payload {
  id: PersonID
  email: EmailAddress
  created_at?: CreatedAt
  custom_attributes?: CustomAttributes
}
/**
 * Optional custom attributes for this person. When updating a person, attributes are added and not removed.
 */
export interface CustomAttributes {
  [k: string]: unknown
}

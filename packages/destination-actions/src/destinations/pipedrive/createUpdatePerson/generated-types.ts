// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * Identifier used to find existing person in Pipedrive. Can be an email, name, phone number, or custom field value. Custom person fields may be included by using the long hash keys of the custom fields. These look like "33595c732cd7a027c458ea115a48a7f8a254fa86".
 */
export type PersonID = string
/**
 * Name of the person
 */
export type PersonName = string
/**
 * ID of the organization this person will belong to.
 */
export type OrganizationID = number
/**
 * Email addresses for this person.
 */
export type EmailAddress = string[]
/**
 * Phone number for the person.
 */
export type PhoneNumber = string
/**
 * If the person is created, use this timestamp as the creation timestamp. Format: YYY-MM-DD HH:MM:SS
 */
export type CreatedAt = string

export interface Payload {
  identifier: PersonID
  name: PersonName
  org_id?: OrganizationID
  email?: EmailAddress
  phone?: PhoneNumber
  add_time?: CreatedAt
}

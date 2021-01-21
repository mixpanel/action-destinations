// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * Identifier used to find existing organization in Pipedrive. Typically this is the name but it can also be a custom field value. Custom organization fields may be included by using the long hash keys of the custom fields. These look like "33595c732cd7a027c458ea115a48a7f8a254fa86".
 */
export type OrganizationID = string
export type OrganizationName = string
/**
 * ID of the user who will be marked as the owner of this organization. Default is the user who ownes the API token.
 */
export type OwnerID = number
/**
 * If the organization is created, use this timestamp as the creation timestamp. Format: YYY-MM-DD HH:MM:SS
 */
export type CreatedAt = string

export interface Payload {
  identifier: OrganizationID
  name: OrganizationName
  owner_id?: OwnerID
  add_time?: CreatedAt
}

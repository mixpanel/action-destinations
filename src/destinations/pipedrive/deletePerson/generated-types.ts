// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * Identifier used to find person to delete in Pipedrive. Can be an email, name, phone number, or custom field value. Custom person fields may be included by using the long hash keys of the custom fields. These look like "33595c732cd7a027c458ea115a48a7f8a254fa86".
 */
export type PersonID = string

/**
 * Delete a person in Pipedrive.
 */
export interface DeletePerson {
  identifier: PersonID
}

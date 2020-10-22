// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * ID of the marketing contact list you want the contact added to.
 */
export type ListID = string
/**
 * The primary email for the contact.
 */
export type EmailAddress = string
/**
 * Additional emails associated with the contact.
 */
export type AdditionalAmailAddresses =
  | []
  | [string]
  | [string, string]
  | [string, string, string]
  | [string, string, string, string]
  | [string, string, string, string, string]
/**
 * The first line of the address.
 */
export type AddressLine1 = string
/**
 * Optional second line for the address.
 */
export type AddressLine2 = string
/**
 * The city of the contact.
 */
export type City = string
/**
 * The country of the contacts address. Accepts full name or abbreviation.
 */
export type Country = string
/**
 * The contacts personal name.
 */
export type FirstName = string
/**
 * The contacts family name.
 */
export type LastName = string
/**
 * The postcode, post code, Eircode, PIN code or ZIP code.
 */
export type PostalCode = string
/**
 * The state, province, or region of the contacts address.
 */
export type Region = string

/**
 * Update an existing marketing contact or create them if they don't exist.
 */
export interface CreateOrUpdateContact {
  list_id: ListID
  email: EmailAddress
  alternate_emails?: AdditionalAmailAddresses
  address_line_1?: AddressLine1
  address_line_2?: AddressLine2
  city?: City
  country?: Country
  first_name?: FirstName
  last_name?: LastName
  postal_code?: PostalCode
  state_province_region?: Region
  custom_fields?: CustomFields
}
/**
 * Object with custom data to associate with this contact.
 */
export interface CustomFields {
  [k: string]: unknown
}

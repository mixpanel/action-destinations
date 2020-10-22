// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * The ID of the SendGrid list to remove the user from.
 */
export type ListID = string
/**
 * Email address of the user to be removed from the list.
 */
export type EmailAddress = string

/**
 * Remove a recipient from a list.
 */
export interface RemoveRecipientFromList {
  list_id: ListID
  email: EmailAddress
}

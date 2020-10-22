// Generated file. DO NOT MODIFY IT BY HAND.

export type AmplitudeID = string
export type UserID = string
export type Requester = string
/**
 * Ignore invalid user ID (user that doesn't exist in the project) that was passed in.
 */
export type IgnoreInvalidID = boolean
/**
 * Delete from the entire organization rather than just this project.
 */
export type DeleteFromOrganization = boolean

/**
 * Delete a user from Amplitude.
 */
export interface DeleteUser {
  amplitude_id?: AmplitudeID
  user_id?: UserID
  requester?: Requester
  ignore_invalid_id?: IgnoreInvalidID
  delete_from_org?: DeleteFromOrganization
}

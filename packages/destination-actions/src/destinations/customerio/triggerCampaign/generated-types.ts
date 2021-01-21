// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * ID of the campaign to trigger.
 */
export type CampaignID = number
/**
 * List of profile IDs to use as campaign recipients. If this is used, "Recipients" may not be used.
 */
export type ProfileIDs = unknown[]

export interface Payload {
  id: CampaignID
  data?: Data
  recipients?: Recipients
  ids?: ProfileIDs
}
/**
 * Custom Liquid merge data to include with the trigger.
 */
export interface Data {
  [k: string]: unknown
}
/**
 * Additional recipient conditions to filter recipients. If this is used, "IDs" may not be used.
 */
export interface Recipients {
  [k: string]: unknown
}

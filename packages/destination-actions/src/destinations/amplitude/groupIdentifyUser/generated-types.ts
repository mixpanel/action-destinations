// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * A UUID (unique user ID) specified by you. **Note:** If you send a request with a user ID that is not in the Amplitude system yet, then the user tied to that ID will not be marked new until their first event. Required unless device ID is present.
 */
export type UserID2 = UserID | UserID1
/**
 * A UUID (unique user ID) specified by you. **Note:** If you send a request with a user ID that is not in the Amplitude system yet, then the user tied to that ID will not be marked new until their first event. Required unless device ID is present.
 */
export type UserID = string
/**
 * A UUID (unique user ID) specified by you. **Note:** If you send a request with a user ID that is not in the Amplitude system yet, then the user tied to that ID will not be marked new until their first event. Required unless device ID is present.
 */
export type UserID1 = null
/**
 * A device specific identifier, such as the Identifier for Vendor (IDFV) on iOS. Required unless user ID is present.
 */
export type DeviceID = string
/**
 * Amplitude will deduplicate subsequent events sent with this ID we have already seen before within the past 7 days. Amplitude recommends generating a UUID or using some combination of device ID, user ID, event type, event ID, and time.
 */
export type InsertID = string
/**
 * The timestamp of the event. If time is not sent with the event, it will be set to the request upload time.
 */
export type Timestamp = string
export type GroupType = string
export type GroupValue = string

export interface Payload {
  user_id?: UserID2
  device_id?: DeviceID
  insert_id?: InsertID
  time?: Timestamp
  group_properties?: GroupProperties
  group_type: GroupType
  group_value: GroupValue
}
/**
 * Additional data tied to the group in Amplitude.
 */
export interface GroupProperties {
  [k: string]: unknown
}

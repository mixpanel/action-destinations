// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * A UUID (unique user ID) specified by you. **Note:** If you send a request with a user ID that is not in the Amplitude system yet, then the user tied to that ID will not be marked new until their first event. Required unless device ID is present.
 */
export type UserID = string
/**
 * A device specific identifier, such as the Identifier for Vendor (IDFV) on iOS. Required unless user ID is present.
 */
export type DeviceID = string
/**
 * Version of the app the user is on.
 */
export type AppVersion = string
/**
 * What platform is sending the data.
 */
export type Platform = string
/**
 * Mobile operating system or browser the user is on.
 */
export type OSName = string
/**
 * Version of the mobile operating system or browser the user is on.
 */
export type OSVersion = string
/**
 * Device brand the user is on.
 */
export type DeviceBrand = string
/**
 * Device manufacturer the user is on.
 */
export type DeviceManufacturer = string
/**
 * Device model the user is on.
 */
export type DeviceModel = string
/**
 * Carrier the user has.
 */
export type Carrier = string
/**
 * Country the user is in.
 */
export type Country = string
/**
 * Geographical region the user is in.
 */
export type Region = string
/**
 * What city the user is in.
 */
export type City = string
/**
 * The Designated Market Area of the user.
 */
export type DesignatedMarketArea = string
/**
 * Language the user has set.
 */
export type Language = string
/**
 * Whether the user is paying or not.
 */
export type IsPaying = boolean
/**
 * Version of the app the user was first on.
 */
export type InitialVersion = string

/**
 * Set the user ID for a particular device ID or update user properties without sending an event to Amplitude.
 */
export interface IdentifyUser {
  user_id?: UserID
  device_id?: DeviceID
  user_properties?: UserProperties
  groups?: Groups
  app_version?: AppVersion
  platform?: Platform
  os_name?: OSName
  os_version?: OSVersion
  device_brand?: DeviceBrand
  device_manufacturer?: DeviceManufacturer
  device_model?: DeviceModel
  carrier?: Carrier
  country?: Country
  region?: Region
  city?: City
  dma?: DesignatedMarketArea
  language?: Language
  paying?: IsPaying
  start_version?: InitialVersion
}
/**
 * Additional data tied to the user in Amplitude. Each distinct value will show up as a user segment on the Amplitude dashboard. Object depth may not exceed 40 layers. **Note:** You can store property values in an array and date values are transformed into string values.
 */
export interface UserProperties {
  [k: string]: unknown
}
/**
 * Groups of users for Amplitude's account-level reporting feature. Note: You can only track up to 5 groups. Any groups past that threshold will not be tracked. **Note:** This feature is only available to Amplitude Enterprise customers who have purchased the Amplitude Accounts add-on.
 */
export interface Groups {
  [k: string]: unknown
}

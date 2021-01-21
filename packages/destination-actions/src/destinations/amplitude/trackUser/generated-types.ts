// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * A readable ID specified by you. Must have a minimum length of 5 characters. Required unless device ID is present.
 */
export type UserID2 = UserID | UserID1
/**
 * A readable ID specified by you. Must have a minimum length of 5 characters. Required unless device ID is present.
 */
export type UserID = string
/**
 * A readable ID specified by you. Must have a minimum length of 5 characters. Required unless device ID is present.
 */
export type UserID1 = null
/**
 * A device-specific identifier, such as the Identifier for Vendor on iOS. Required unless user ID is present. If a device ID is not sent with the event, it will be set to a hashed version of the user ID.
 */
export type DeviceID = string
/**
 * A unique identifier for your event.
 */
export type EventType = string
/**
 * The timestamp of the event. If time is not sent with the event, it will be set to the request upload time.
 */
export type Timestamp = string
/**
 * The current version of your application.
 */
export type AppVersion = string
/**
 * Platform of the device.
 */
export type Platform = string
/**
 * The name of the mobile operating system or browser that the user is using.
 */
export type OSName = string
/**
 * The version of the mobile operating system or browser the user is using.
 */
export type OSVersion = string
/**
 * The device brand that the user is using.
 */
export type DeviceBrand = string
/**
 * The device manufacturer that the user is using.
 */
export type DeviceManufacturer = string
/**
 * The device model that the user is using.
 */
export type DeviceModel = string
/**
 * The carrier that the user is using.
 */
export type Carrier = string
/**
 * The current country of the user.
 */
export type Country = string
/**
 * The current region of the user.
 */
export type Region = string
/**
 * The current city of the user.
 */
export type City = string
/**
 * The current Designated Market Area of the user.
 */
export type DesignatedMarketArea = string
/**
 * The language set by the user.
 */
export type Language = string
/**
 * The price of the item purchased. Required for revenue data if the revenue field is not sent. You can use negative values to indicate refunds.
 */
export type Price = number
/**
 * The quantity of the item purchased. Defaults to 1 if not specified.
 */
export type Quantity = number
/**
 * Revenue = price * quantity. If you send all 3 fields of price, quantity, and revenue, then (price * quantity) will be used as the revenue value. You can use negative values to indicate refunds.
 */
export type Revenue = number
/**
 * An identifier for the item purchased. You must send a price and quantity or revenue with this field.
 */
export type ProductID = string
/**
 * The type of revenue for the item purchased. You must send a price and quantity or revenue with this field.
 */
export type RevenueType = string
/**
 * The current Latitude of the user.
 */
export type Latitude = number
/**
 * The current Longitude of the user.
 */
export type Longtitude = number
/**
 * The IP address of the user. Use "$remote" to use the IP address on the upload request. Amplitude will use the IP address to reverse lookup a user's location (city, country, region, and DMA). Amplitude has the ability to drop the location and IP address from events once it reaches our servers. You can submit a request to Amplitude's platform specialist team here to configure this for you.
 */
export type IPAddress = string
/**
 * Identifier for Advertiser. _(iOS)_
 */
export type IdentifierForAdvertiserIDFA = string
/**
 * Identifier for Vendor. _(iOS)_
 */
export type IdentifierForVendorIDFV = string
/**
 * Google Play Services advertising ID. _(Android)_
 */
export type GooglePlayServicesAdvertisingID = string
/**
 * Android ID (not the advertising ID). _(Android)_
 */
export type AndroidID = string
/**
 * An incrementing counter to distinguish events with the same user ID and timestamp from each other. Amplitude recommends you send an event ID, increasing over time, especially if you expect events to occur simultanenously.
 */
export type EventID = number
/**
 * The start time of the session, necessary if you want to associate events with a particular system.
 */
export type SessionID = string
/**
 * Amplitude will deduplicate subsequent events sent with this ID we have already seen before within the past 7 days. Amplitude recommends generating a UUID or using some combination of device ID, user ID, event type, event ID, and time.
 */
export type InsertID = string

export interface Payload {
  user_id?: UserID2
  device_id?: DeviceID
  event_type: EventType
  time?: Timestamp
  event_properties?: EventProperties
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
  price?: Price
  quantity?: Quantity
  revenue?: Revenue
  productId?: ProductID
  revenueType?: RevenueType
  location_lat?: Latitude
  location_lng?: Longtitude
  ip?: IPAddress
  idfa?: IdentifierForAdvertiserIDFA
  idfv?: IdentifierForVendorIDFV
  adid?: GooglePlayServicesAdvertisingID
  android_id?: AndroidID
  event_id?: EventID
  session_id?: SessionID
  insert_id?: InsertID
}
/**
 * An object of key-value pairs that represent additional data to be sent along with the event. You can store property values in an array. Date values are transformed into string values. Object depth may not exceed 40 layers.
 */
export interface EventProperties {
  [k: string]: unknown
}
/**
 * An object of key-value pairs that represent additional data tied to the user. You can store property values in an array. Date values are transformed into string values. Object depth may not exceed 40 layers.
 */
export interface UserProperties {
  [k: string]: unknown
}
/**
 * Groups of users for the event as an event-level group. You can only track up to 5 groups. **Note:** This Amplitude feature is only available to Enterprise customers who have purchased the Accounts add-on.
 */
export interface Groups {
  [k: string]: unknown
}

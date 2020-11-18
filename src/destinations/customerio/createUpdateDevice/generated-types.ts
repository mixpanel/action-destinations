// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * ID of the person that this device belongs to.
 */
export type PersonID = string
/**
 * Unique ID for this device.
 */
export type DeviceID = string
/**
 * The device platform.
 */
export type Platform = 'ios' | 'android'
/**
 * Timestamp for when the device was last used. Default is current date and time.
 */
export type LastUsed = string

export interface Payload {
  person_id: PersonID
  device_id: DeviceID
  platform: Platform
  last_used?: LastUsed
}

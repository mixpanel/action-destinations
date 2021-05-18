// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * ID of the person who triggered this event.
 */
export type PersonID = string
/**
 * Name of the event
 */
export type EventName = string
/**
 * Override event type. Ex. "page".
 */
export type EventType = string

export interface Payload {
  id: PersonID
  name: EventName
  type?: EventType
  data?: Data
}
/**
 * Custom data to include with the event.
 */
export interface Data {
  [k: string]: unknown
}

// Generated file. DO NOT MODIFY IT BY HAND.

export type EventName = string

/**
 * Track an event not tied to a known person.
 */
export interface TrackAnonymousEvent {
  name: EventName
  data?: Data
}
/**
 * Custom data to include with the event. If "recipient", "from_address", or "reply_to" are sent, they will override settings on any campaigns triggered by this event. "recipient" is required if the event is used to trigger a campaign.
 */
export interface Data {
  [k: string]: unknown
}

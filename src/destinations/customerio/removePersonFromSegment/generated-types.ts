// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * ID of the Customer.io segment to remove the person from.
 */
export type SegmentID = number
/**
 * ID of the person to remove.
 */
export type PersonID = string

export interface Payload {
  segment_id: SegmentID
  person_id: PersonID
}

// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * ID of the Customer.io segment to add the person to.
 */
export type SegmentID = number
/**
 * ID of the person to add.
 */
export type PersonID = string

/**
 * Add a person to a segment in Customer.io.
 */
export interface AddPersonToSegment {
  segment_id: SegmentID
  person_id: PersonID
}

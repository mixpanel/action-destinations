import * as amplitude from './amplitude-plugins'
import * as braze from './braze'

export const destinations = {
  // TODO figure out if it's possible to colocate the Amplitude web action with the rest of its destination definition (in `./packages/destination-actions`)
  '5f7dd6d21ad74f3842b1fc47': amplitude.destination,
  '60fb01aec459242d3b6f20c1': braze.destination
}

export type ActionDestinationSlug = keyof typeof destinations

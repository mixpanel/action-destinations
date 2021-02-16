import { Destination, DestinationDefinition } from '../lib/destination-kit'
import amplitude from './amplitude'
import customerio from './customerio'
import pipedrive from './pipedrive'
import slack from './slack'

export type ActionDestinationSlug = 'amplitude' | 'customerio' | 'pipedrive' | 'slack'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const destinations: Record<ActionDestinationSlug, DestinationDefinition<any>> = {
  amplitude,
  customerio,
  pipedrive,
  slack
}

export const idToSlug: Record<string, string> = {
  '5f7dd6d21ad74f3842b1fc47': 'amplitude',
  '5f7dd78fe27ce7ff2b8bfa37': 'customerio',
  '5f7dd8191ad74f868ab1fc48': 'pipedrive',
  '5f7dd8e302173ff732db5cc4': 'slack'
}

export function getDestinationBySlug(slug: string): Destination {
  const destination = destinations[slug as ActionDestinationSlug]

  if (!destination) {
    throw new Error('Destination not found')
  }

  return new Destination(destination)
}

export function getDestinationByIdOrSlug(idOrSlug: string): Destination {
  const slug = idToSlug[idOrSlug] ?? idOrSlug
  return getDestinationBySlug(slug)
}

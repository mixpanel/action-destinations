import { Destination, DestinationDefinition } from '@segment/actions-core'
import amplitude from './amplitude'
import braze from './braze'
import customerio from './customerio'
import pipedrive from './pipedrive'
import slack from './slack'
import twilio from './twilio'
import googleAnalytics4 from './google-analytics-4'
import googleEnhancedConversions from './google-enhanced-conversions'

/**
 * To register an integration in the `integrations` service
 * you'll need to add it to the `destinations` export
 * as well as the `idToSlug` with the corresponding production id.
 *
 * To test in staging, the ids should match across environments.
 * It is recommended that you register/create destination definitions
 * in production and sync them into staging via `sprout`.
 */
export const destinations = {
  amplitude,
  braze,
  customerio,
  pipedrive,
  slack,
  twilio,
  'google-analytics-4': googleAnalytics4,
  'google-enhanced-conversions': googleEnhancedConversions
}

export type ActionDestinationSlug = keyof typeof destinations

export const idToSlug: Record<string, ActionDestinationSlug> = {
  '5f7dd6d21ad74f3842b1fc47': 'amplitude',
  '5f7dd78fe27ce7ff2b8bfa37': 'customerio',
  '5f7dd8191ad74f868ab1fc48': 'pipedrive',
  '5f7dd8e302173ff732db5cc4': 'slack',
  '602efa1f249b9a5e2bf8a813': 'twilio',
  '60ad61f9ff47a16b8fb7b5d9': 'google-analytics-4',
  '60ae8b97dcb6cc52d5d0d5ab': 'google-enhanced-conversions',
  '60f9d0d048950c356be2e4da': 'braze'
}

export const browserDestinationsIdToSlug: Record<string, string> = {
  '5f7dd6d21ad74f3842b1fc47': 'amplitude',
  // Change these IDs when destination definitions are created for the following items
  fullstory: 'fullstory',
  intercom: 'intercom'
}

/** Attempts to load a destination definition from a given file path */
export async function getDestinationLazy(slug: string): Promise<null | DestinationDefinition> {
  const destination = await import(`./${slug}`).then((mod) => mod.default)

  // Loose validation on a destination definition
  if (!destination?.name || typeof destination?.actions !== 'object') {
    return null
  }

  return destination
}

export async function getDestinationBySlug(slug: string): Promise<Destination> {
  const destination = destinations[slug as ActionDestinationSlug] ?? (await getDestinationLazy(slug))

  if (!destination) {
    throw new Error('Destination not found')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Destination(destination as DestinationDefinition<any>)
}

export async function getDestinationByIdOrSlug(idOrSlug: string): Promise<Destination> {
  const slug = idToSlug[idOrSlug] ?? idOrSlug
  return getDestinationBySlug(slug)
}

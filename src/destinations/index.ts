import { Destination, DestinationDefinition } from '@/lib/destination-kit'
import airtable from './airtable'
import amplitude from './amplitude'
import customerio from './customerio'
import pipedrive from './pipedrive'
import sendgrid from './sendgrid'
import slack from './slack'

const destinations: Record<string, DestinationDefinition<any>> = {
  airtable,
  amplitude,
  customerio,
  pipedrive,
  sendgrid,
  slack
}

const idToSlug: Record<string, string> = {
  '5f7dd5e61ad74fefa2b1fc46': 'airtable',
  '5f7dd6d21ad74f3842b1fc47': 'amplitude',
  '5f7dd78fe27ce7ff2b8bfa37': 'customerio',
  '5f7dd8191ad74f868ab1fc48': 'pipedrive',
  '5f7dd8848e9d93aafb6cecd8': 'sendgrid',
  '5f7dd8e302173ff732db5cc4': 'slack'
}

function getDestinationBySlug(slug: string): Destination {
  const destination = destinations[slug]

  if (!destination) {
    throw new Error('Destination not found')
  }

  return new Destination(destination)
}

export function getDestinationByIdOrSlug(idOrSlug: string): Destination {
  const slug = idToSlug[idOrSlug] ?? idOrSlug
  return getDestinationBySlug(slug)
}

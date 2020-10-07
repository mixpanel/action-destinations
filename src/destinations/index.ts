import { Destination } from '@/lib/destination-kit'
import airtable from './airtable'
import amplitude from './amplitude'
import customerio from './customer-io'
import pipedrive from './pipedrive'
import sendgrid from './sendgrid'
import slack from './slack'

const idToSlug: Record<string, string> = {
  '5f7dd5e61ad74fefa2b1fc46': 'airtable',
  '5f7dd6d21ad74f3842b1fc47': 'amplitude',
  '5f7dd78fe27ce7ff2b8bfa37': 'customerio',
  '5f7dd8191ad74f868ab1fc48': 'pipedrive',
  '5f7dd8848e9d93aafb6cecd8': 'sendgrid',
  '5f7dd8e302173ff732db5cc4': 'slack'
}

export function getDestinationBySlug(slug: string): Destination {
  switch (slug) {
    case 'airtable':
      return airtable
    case 'amplitude':
      return amplitude
    case 'customerio':
      return customerio
    case 'pipedrive':
      return pipedrive
    case 'sendgrid':
      return sendgrid
    case 'slack':
      return slack
    default:
      throw new Error('Destination not found')
  }
}

export function getDestinationByIdOrSlug(idOrSlug: string): Destination {
  const slug = idToSlug[idOrSlug] ?? idOrSlug
  return getDestinationBySlug(slug)
}

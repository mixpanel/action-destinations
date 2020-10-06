import { Destination } from '@/lib/destination-kit'
import airtable from './airtable'
import amplitude from './amplitude'
import customerio from './customer-io'
import pipedrive from './pipedrive'
import sendgrid from './sendgrid'
import slack from './slack'

export default function(slug: string): Destination {
  switch (slug) {
    case 'airtable':
      return airtable
    case 'amplitude':
      return amplitude
    case 'customer-io':
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

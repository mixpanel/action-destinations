import { Destination } from '@/lib/destination-kit'
import config from './destination.json'

const destination = new Destination(config).extendRequest(({ settings }) => ({
  headers: {
    'User-Agent': 'Segment/2.0',
    Authorization: `Bearer ${settings.apiKey}`
  },
  responseType: 'json'
}))

export default destination

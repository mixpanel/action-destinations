import { Destination } from '@/lib/destination-kit'
import config from './destination.json'

import postWebhook from './postWebhook'

const destination = new Destination(config)
  .extendRequest(({ settings }) => ({
    prefixUrl: settings.url as string,
    headers: {
      'User-Agent': 'Destinations/2.0'
    },
    responseType: 'json'
  }))

  .partnerAction('postWebhook', postWebhook)

export default destination

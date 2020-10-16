import { Destination } from '@/lib/destination-kit'
import config from './destination.json'

import trackUser from './trackUser'
import complexTrackUser from './complexTrackUser'

const destination = new Destination(config)
  .extendRequest(({ settings }) => ({
    prefixUrl: settings.url as string,
    headers: {
      'User-Agent': 'Destinations/2.0'
    },
    responseType: 'json'
  }))

  .partnerAction('trackUser', trackUser)
  .partnerAction('complexTrackUser', complexTrackUser)

export default destination

import type { DestinationDefinition } from '@segment/actions-core'
import type { Settings } from './generated-types'
import purchase from './purchase'
import addToCart from './addToCart'

const destination: DestinationDefinition<Settings> = {
  name: 'Google Analytics 4',
  authentication: {
    scheme: 'custom',
    fields: {
      apiSecret: {
        label: 'API Secret',
        description:
          'An API SECRET generated in the Google Analytics UI, navigate to: Admin > Data Streams > choose your stream > Measurement Protocol > Create',
        type: 'string',
        required: true
      },
      measurementId: {
        label: 'Measurement ID',
        description:
          'The measurement ID associated with a stream. Found in the Google Analytics UI under: Admin > Data Streams > choose your stream > Measurement ID',
        type: 'string',
        required: true
      }
    },
    testAuthentication: (_request) => {
      // Return a request that tests/validates the user's authentication fields here
      // TODO: maybe run a post to the google measurements protocol debug endpoint
      return true
    }
  },
  extendRequest({ settings }) {
    return {
      searchParams: {
        measurement_id: settings.measurementId,
        api_secret: settings.apiSecret
      }
    }
  },
  actions: {
    purchase,
    addToCart
  }
}

export default destination

import type { Settings } from './generated-types'
import type { BrowserDestinationDefinition } from '../../lib/browser-destinations'
import { browserDestination } from '../../runtime/shim'

// Switch from unknown to the partner SDK client types
export const destination: BrowserDestinationDefinition<Settings, unknown> = {
  name: 'Braze Web Mode',
  slug: 'actions-braze-web',

  authentication: {
    fields: {
      api_key: {
        description: 'Created under Developer Console in the Braze Dashboard.',
        label: 'API Key',
        type: 'string',
        required: true
      },
      endpoint: {
        description: 'Your Braze SDK endpoint. [See more details](https://www.braze.com/docs/api/basics/#endpoints).',
        label: 'SDK Endpoint',
        type: 'string',
        format: 'uri',
        required: true
      }
    }
  },

  initialize: async () => {
    // return appboy
  },

  actions: {}
}

export default browserDestination(destination)

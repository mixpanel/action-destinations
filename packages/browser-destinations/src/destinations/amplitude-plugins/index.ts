import type { Settings } from './generated-types'
import type { BrowserDestinationDefinition } from '../../lib/browser-destinations'
import { browserDestination } from '../../runtime/plugin'
import sessionId from './sessionId'

export const destination: BrowserDestinationDefinition<Settings, {}> = {
  name: 'Amplitude Browser Plugins',
  actions: {
    sessionId
  },
  initialize: async () => {
    return {}
  }
}

export default browserDestination(destination)

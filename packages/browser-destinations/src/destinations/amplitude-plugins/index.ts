import type { Settings } from './generated-types'
import { BrowserDestinationDefinition } from '../../lib/browser-destinations'
import sessionId from './sessionId'

const destination: BrowserDestinationDefinition<Settings, {}> = {
  name: 'Amplitude Browser Plugins',
  actions: {
    sessionId
  },
  initialize: async () => {
    return {}
  }
}

export default destination

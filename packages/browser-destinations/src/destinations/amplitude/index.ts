import logEvent from './logEvent'
import { AmplitudeClient } from 'amplitude-js'
import type { Settings } from './generated-types'
import { BrowserDestinationDefinition } from '../../lib/browser-destinations'
import { loadScript } from '../../runtime/load-script'

const destination: BrowserDestinationDefinition<Settings, AmplitudeClient> = {
  name: 'Amplitude',
  authentication: {
    fields: {
      apiKey: {
        type: 'string',
        required: true,
        description:
          'The API key to be used for tracking. https://help.amplitude.com/hc/en-us/articles/235649848-Settings#general'
      }
    }
  },
  actions: {
    logEvent
  },
  initialize: async (settings) => {
    await loadScript('https://cdn.amplitude.com/libs/amplitude-7.2.1-min.gz.js')
    const instance = window.amplitude.getInstance()
    instance.init(settings.apiKey)
    return instance
  }
}

export default destination

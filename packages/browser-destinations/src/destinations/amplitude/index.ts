import logEvent from './logEvent'
import orderCompleted from './orderCompleted'
import sessionPlugin from './sessionPlugin'

import { AmplitudeClient } from 'amplitude-js'
import type { Settings } from './generated-types'
import type { BrowserDestinationDefinition } from '../../lib/browser-destinations'
import { loadScript } from '../../runtime/load-script'
import { browserDestination } from '../../runtime/shim'

export const destination: BrowserDestinationDefinition<Settings, AmplitudeClient> = {
  name: 'Amplitude',
  authentication: {
    fields: {
      apiKey: {
        label: 'API Key',
        type: 'string',
        required: true,
        description:
          'The API key to be used for tracking. https://help.amplitude.com/hc/en-us/articles/235649848-Settings#general'
      }
    }
  },
  actions: {
    logEvent,
    orderCompleted,
    sessionPlugin
  },
  initialize: async ({ settings, analytics }) => {
    await loadScript('https://cdn.amplitude.com/libs/amplitude-7.2.1-min.gz.js')
    const instance = window.amplitude.getInstance()

    const user = analytics.user()
    const userId = user.id() ?? user.anonymousId()

    instance.init(settings.apiKey, undefined, {
      deviceId: userId ?? undefined
    })

    return instance
  }
}

export default browserDestination(destination)

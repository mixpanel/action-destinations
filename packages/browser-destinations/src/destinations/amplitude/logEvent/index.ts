import { AmplitudeClient } from 'amplitude-js'
import { BrowserActionDefinition } from '../../../lib/browser-destinations'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: BrowserActionDefinition<Settings, AmplitudeClient, Payload> = {
  title: 'LogEvent',
  description:
    'Log an event with eventType and eventProperties. https://amplitude.github.io/Amplitude-JavaScript/#amplitudeclientlogevent',
  recommended: true,
  fields: {
    eventName: {
      type: 'string',
      required: true,
      default: { '@path': '$.event' }
    },
    eventProperties: {
      type: 'object',
      required: false,
      default: { '@path': '$.properties' }
    }
  },
  perform: (amplitude, { payload }) => {
    return amplitude.logEvent(payload.eventName, payload.eventProperties ?? {})
  }
}

export default action

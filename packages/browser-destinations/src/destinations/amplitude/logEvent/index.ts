import { AmplitudeClient } from 'amplitude-js'
import type { BrowserActionDefinition } from '../../../lib/browser-destinations'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: BrowserActionDefinition<Settings, AmplitudeClient, Payload> = {
  title: 'Log Event',
  description:
    'Log an event with eventType and eventProperties. https://amplitude.github.io/Amplitude-JavaScript/#amplitudeclientlogevent',
  fields: {
    eventName: {
      label: 'Event Name',
      description: 'The event name to send to Amplitude',
      type: 'string',
      required: true,
      default: { '@path': '$.event' }
    },
    eventProperties: {
      label: 'Event Properties',
      description: 'The event properties to send to Amplitude',
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

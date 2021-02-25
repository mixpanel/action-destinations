import dayjs from '../../../lib/dayjs'
import type { ActionDefinition } from '../../../lib/destination-kit/action'
import { eventSchema } from '../event-schema'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

interface AmplitudeEvent extends Omit<Payload, 'products' | 'time'> {
  time?: number
}

const action: ActionDefinition<Settings, Payload> = {
  title: 'Track Screen View',
  description: 'Send an event to Amplitude when a user sees a screen on a mobile device.',
  recommended: false,
  defaultSubscription: 'type = "screen"',
  fields: eventSchema,
  perform: (request, { settings, payload }) => {
    const event = { ...payload } as AmplitudeEvent

    if (payload.time && dayjs.utc(payload.time).isValid()) {
      event.time = dayjs.utc(payload.time).valueOf()
    }

    if (payload.session_id && dayjs.utc(payload.session_id).isValid()) {
      event.session_id = dayjs.utc(payload.session_id).valueOf()
    }

    return request.post('https://api2.amplitude.com/2/httpapi', {
      json: {
        api_key: settings.apiKey,
        events: [event]
      }
    })
  }
}

export default action

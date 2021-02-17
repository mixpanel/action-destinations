import dayjs from '../../../lib/dayjs'
import type { ActionDefinition } from '../../../lib/destination-kit/action'
import { eventSchema } from '../event-schema'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

interface AmplitudeEvent extends Omit<Payload, 'products' | 'time' | 'session_id'> {
  time?: number
  session_id?: number
}

const action: ActionDefinition<Settings, Payload> = {
  title: 'Track Page View',
  description: 'Send an event to Amplitude when a user sees a page.',
  recommended: false,
  defaultSubscription: 'type = "page"',
  fields: eventSchema,
  perform: (request, { settings, payload }) => {
    // This is identical to `trackUser` action. Clearly opportunity to re-think
    const event = { ...payload } as AmplitudeEvent

    if (payload.time) {
      event.time = dayjs.utc(payload.time).valueOf()
    }

    if (payload.session_id) {
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

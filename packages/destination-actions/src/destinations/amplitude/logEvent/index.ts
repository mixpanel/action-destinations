import dayjs from '../../../lib/dayjs'
import { eventSchema } from '../event-schema'
import type { ActionDefinition } from '@segment/actions-core'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

interface AmplitudeEvent extends Omit<Payload, 'products' | 'time' | 'session_id'> {
  time?: number
  session_id?: number
}

const action: ActionDefinition<Settings, Payload> = {
  title: 'Log Event',
  description: 'Send an event to Amplitude.',
  recommended: true,
  defaultSubscription: 'type = "track"',
  fields: eventSchema,
  perform: (request, { payload, settings }) => {
    const event = { ...payload } as AmplitudeEvent

    if (payload.time && dayjs.utc(payload.time).isValid()) {
      event.time = dayjs.utc(payload.time).valueOf()
    }

    if (payload.session_id && dayjs.utc(payload.session_id).isValid()) {
      event.session_id = dayjs.utc(payload.session_id).valueOf()
    }

    return request('https://api2.amplitude.com/2/httpapi', {
      method: 'post',
      json: {
        api_key: settings.apiKey,
        events: [event]
      }
    })
  }
}

export default action

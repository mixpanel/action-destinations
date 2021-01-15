import dayjs from '@/lib/dayjs'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { eventSchema } from '../event-schema'
import { Settings } from '../generated-types'
import { Payload } from './generated-types'

interface AmplitudeEvent extends Omit<Payload, 'products' | 'time' | 'session_id'> {
  time?: number
  session_id?: number
}

const action: ActionDefinition<Settings, Payload> = {
  title: 'Track User',
  description: 'Sends user events to Amplitude.',
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    defaultSubscription: 'type = "track"',
    properties: eventSchema,
    additionalProperties: false,
    required: ['event_type']
  },
  perform: (req, { payload, settings }) => {
    const event = { ...payload } as AmplitudeEvent

    if (payload.time) {
      event.time = dayjs.utc(payload.time).valueOf()
    }

    if (payload.session_id) {
      event.session_id = dayjs.utc(payload.session_id).valueOf()
    }

    return req.post('https://api2.amplitude.com/2/httpapi', {
      json: {
        api_key: settings.apiKey,
        events: [event]
      }
    })
  }
}

export default action

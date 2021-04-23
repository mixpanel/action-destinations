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
  fields: {
    ...eventSchema,
    use_batch_endpoint: {
      title: 'Use Batch Endpoint',
      description:
        "If true, events are sent to Amplitude's `batch` endpoint rather than their `httpapi` events endpoint. Enabling this setting may help reduce 429s – or throttling errors – from Amplitude. More information about Amplitude's throttling is available in [their docs](https://developers.amplitude.com/docs/batch-event-upload-api#429s-in-depth).",
      type: 'boolean',
      default: false
    }
  },
  perform: (request, { payload, settings }) => {
    const event = { ...payload } as AmplitudeEvent

    if (payload.time && dayjs.utc(payload.time).isValid()) {
      event.time = dayjs.utc(payload.time).valueOf()
    }

    if (payload.session_id && dayjs.utc(payload.session_id).isValid()) {
      event.session_id = dayjs.utc(payload.session_id).valueOf()
    }

    const endpoint = payload.use_batch_endpoint
      ? 'https://api2.amplitude.com/batch'
      : 'https://api2.amplitude.com/2/httpapi'

    return request(endpoint, {
      method: 'post',
      json: {
        api_key: settings.apiKey,
        events: [event]
      }
    })
  }
}

export default action

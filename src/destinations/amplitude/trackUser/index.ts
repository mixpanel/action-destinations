import dayjs from '@/lib/dayjs'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { TrackUser } from './generated-types'
import schema from './payload.schema.json'

const definition: ActionDefinition<Settings, TrackUser> = {
  schema,
  perform: (req, { payload, settings }) => {
    const event = { ...payload }

    if (payload.time) {
      event.time = dayjs.utc(payload.time).format('x')
    }

    if (payload.session_id) {
      event.session_id = dayjs.utc(payload.session_id).format('x')
    }

    return req.post('https://api2.amplitude.com/2/httpapi', {
      json: {
        api_key: settings.apiKey,
        events: [event]
      }
    })
  }
}

export default definition

import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
  return action
    .validatePayload(payloadSchema)

    .cachedRequest({
      ttl: 10,
      key: ({ payload }) => payload.number,
      value: async (req, { payload }) => {
        const url = `http://numbersapi.com/${payload.number}/trivia`
        const resp = await req.get(url, { responseType: 'text' })
        payload.properties.number = {
          value: payload.number,
          trivia: resp.body
        }
        delete payload.number
        return resp
      },
      as: 'trivia'
    })

    .request((req, { settings, trivia }) => req.post(settings.url, { json: trivia }))
}

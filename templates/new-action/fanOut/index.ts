import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
  return action
    .validatePayload(payloadSchema) // Send a separate request for every email address in the 'emails' field of the payload.

    .fanOut({
      on: 'payload.emails',
      as: 'email'
    })

    .request((req, { payload, email }) => {
      // Remove emails from the final payload
      const { emails, ...cleanPayload } = payload

      return req.post('http://example.com', {
        json: {
          email,
          ...cleanPayload
        }
      })
    })

    .fanIn()
}

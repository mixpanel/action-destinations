import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

export default function(action: Action): Action {
  return action
    .validatePayload(payloadSchema)

    .mapField('created_at', {
      '@timestamp': {
        timestamp: { '@path': '$.created_at' },
        format: 'X'
      }
    })

    .request(async (req, { payload }) => {
      const { id, custom_attributes: customAttrs, ...body } = payload

      return req.put(`customers/${id}`, {
        json: {
          ...customAttrs,
          ...body
        }
      })
    })
}

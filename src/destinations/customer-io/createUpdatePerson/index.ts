import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { CreateOrUpdatePerson } from './generated-types'

export default function(action: Action<Settings, CreateOrUpdatePerson>): Action<Settings, CreateOrUpdatePerson> {
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

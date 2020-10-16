import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'

interface GetUserResponse {
  id: string
}

export default function(action: Action): Action {
  return action
    .validatePayload(payloadSchema)

    .cachedRequest({
      ttl: 60,
      key: ({ payload }) => payload.email as string,
      value: async (req, { payload }) => {
        const user = await req.get<GetUserResponse>('users/search', {
          searchParams: { email: payload.email }
        })
        return user.body.id
      },
      as: 'userId'
    })

    .request(async (req, { payload, userId }) => {
      if (userId === undefined || userId === null) {
        return req.post('http://example.com/users', {
          json: payload
        })
      } else {
        return req.put(`http://example.com/users/${userId}`, {
          json: payload
        })
      }
    })
}

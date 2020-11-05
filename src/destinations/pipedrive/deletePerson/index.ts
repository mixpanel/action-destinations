import { get } from 'lodash'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { DeletePerson } from './generated-types'
import schema from './payload.schema.json'

const definition: ActionDefinition<Settings, DeletePerson> = {
  schema,

  cachedFields: {
    personId: {
      ttl: 60,
      key: ({ payload }) => payload.identifier,
      value: async (req, { payload }) => {
        const search = await req.get('persons/search', {
          searchParams: {
            term: payload.identifier
          }
        })

        return get(search.body, 'data.items[0].item.id')
      }
    }
  },

  perform: (req, { cachedFields }) => {
    const personId = cachedFields.personId

    if (personId === undefined || personId === null) {
      return null
    }
    return req.delete(`persons/${personId}`)
  }
}

export default definition

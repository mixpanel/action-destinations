import { ActionDefinition, IntegrationError } from '@segment/actions-core'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Group Identify User',
  description: 'Updates or adds properties to a group profile. The profile is created if it does not exist.',
  defaultSubscription: 'type = "group"',
  fields: {
    group_key: {
      label: 'Group Key',
      type: 'string',
      description: 'The group key. If this is not set, it is defaulted to "name".',
      default: 'name'
    },
    traits: {
      label: 'Group Properties',
      type: 'object',
      description:
        'Properties to set on the group profile. Make sure to have a field that corresponds to the above group key.',
      default: {
        '@path': '$.traits'
      }
    }
  },
  perform: (request, { payload, settings }) => {
    if (!payload.traits) {
      throw new IntegrationError('"traits" is a required field', 'Missing required fields')
    }
    if (!payload.traits[payload.group_key]) {
      throw new IntegrationError('Group traits does not include proper group key', 'Misconfigured required field')
    }
    const data = {
      $token: settings.projectToken,
      $group_key: payload.group_key,
      $group_id: payload.traits[payload.group_key],
      $set: payload.traits
    }

    return request('https://api.mixpanel.com/groups#group-set', {
      method: 'post',
      body: new URLSearchParams({ data: JSON.stringify(data) })
    })
  }
}

export default action

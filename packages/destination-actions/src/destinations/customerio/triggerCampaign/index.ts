import type { ActionDefinition, AutocompleteResponse, RequestFn } from '@segment/actions-core'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

interface Campaigns {
  campaigns: Campaign[]
}

interface Campaign {
  id: string
  name: string
}

const idAutocomplete: RequestFn<Settings, Payload, AutocompleteResponse> = async (request, { settings }) => {
  const response = await request('https://beta-api.customer.io/v1/api/campaigns', {
    username: settings.siteId,
    password: settings.apiKey
  })

  const items = (response.data as Campaigns).campaigns.map((campaign) => ({
    label: campaign.name,
    value: campaign.id
  }))

  return {
    body: {
      data: items,
      pagination: {}
    }
  }
}

const action: ActionDefinition<Settings, Payload> = {
  title: 'Trigger Broadcast',
  description: 'Trigger a Customer.io broadcast campaign.',
  fields: {
    id: {
      title: 'Campaign ID',
      description: 'ID of the campaign to trigger.',
      type: 'number',
      required: true,
      autocomplete: true
    },
    data: {
      title: 'Data',
      description: 'Custom Liquid merge data to include with the trigger.',
      type: 'object',
      default: {
        '@path': '$.properties'
      }
    },
    recipients: {
      title: 'Recipients',
      description: 'Additional recipient conditions to filter recipients. If this is used, "IDs" may not be used.',
      type: 'object'
    },
    ids: {
      title: 'Profile IDs',
      description: 'List of profile IDs to use as campaign recipients. If this is used, "Recipients" may not be used.',
      type: 'array'
    }
  },

  autocompleteFields: {
    id: idAutocomplete
  },

  perform: (request, { payload }) => {
    return request(`https://api.customer.io/v1/api/campaigns/${payload.id}/triggers`, {
      method: 'post',
      json: {
        ids: payload.ids,
        data: payload.data,
        recipients: payload.recipients
      }
    })
  }
}

export default action

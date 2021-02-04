import { Got } from 'got'
import { AutocompleteResponse } from '../../../lib/autocomplete'
import { ActionDefinition } from '../../../lib/destination-kit/action'
import { ExecuteInput } from '../../../lib/destination-kit/step'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

interface Campaigns {
  campaigns: Campaign[]
}

interface Campaign {
  id: string
  name: string
}

async function idAutocomplete(req: Got, { settings }: ExecuteInput<Settings, Payload>): Promise<AutocompleteResponse> {
  const response = await req.get<Campaigns>('https://beta-api.customer.io/v1/api/campaigns', {
    prefixUrl: '',
    username: settings.siteId,
    password: settings.apiKey
  })

  const items = response.body.campaigns.map((campaign) => ({
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
  recommended: false,
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

  perform: (req, { payload }) => {
    return req.post(`https://api.customer.io/v1/api/campaigns/${payload.id}/triggers`, {
      json: {
        ids: payload.ids,
        data: payload.data,
        recipients: payload.recipients
      }
    })
  }
}

export default action

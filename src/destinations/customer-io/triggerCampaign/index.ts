import { Got } from 'got'
import { AutocompleteResponse } from '@/lib/autocomplete'
import { ActionDefinition } from '@/lib/destination-kit/action'
import { ExecuteInput } from '@/lib/destination-kit/step'
import { Settings } from '../generated-types'
import { TriggerBroadcastCampaign } from './generated-types'
import schema from './payload.schema.json'

interface Campaigns {
  campaigns: Campaign[]
}

interface Campaign {
  id: string
  name: string
}

async function idAutocomplete(
  req: Got,
  { settings }: ExecuteInput<Settings, TriggerBroadcastCampaign>
): Promise<AutocompleteResponse> {
  const response = await req.get<Campaigns>('https://beta-api.customer.io/v1/api/campaigns', {
    prefixUrl: '',
    headers: {
      Authorization: `Bearer ${settings.appApiKey}`
    }
  })

  const items = response.body.campaigns.map(campaign => ({
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

const definition: ActionDefinition<Settings, TriggerBroadcastCampaign> = {
  schema,

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

export default definition

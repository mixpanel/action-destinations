import { Action } from '@/lib/destination-kit/action'
import payloadSchema from './payload.schema.json'
import { Settings } from '../generated-types'
import { TriggerBroadcastCampaign } from './generated-types'

interface Campaigns {
  campaigns: Campaign[]
}

interface Campaign {
  id: string
  name: string
}

export default function(
  action: Action<Settings, TriggerBroadcastCampaign>
): Action<Settings, TriggerBroadcastCampaign> {
  return action
    .validatePayload(payloadSchema)

    .autocomplete('id', async (req, { settings }) => {
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
    })

    .request(async (req, { payload }) => {
      return req.post(`https://api.customer.io/v1/api/campaigns/${payload.id}/triggers`, {
        json: {
          ids: payload.ids,
          data: payload.data,
          recipients: payload.recipients
        }
      })
    })
}

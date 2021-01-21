import { Got } from 'got'
import { AutocompleteResponse } from '../../../lib/autocomplete'
import type { Settings } from '../generated-types'

interface ListResponse {
  segments: Segment[]
}

interface Segment {
  id: string
  name: string
}

export default async function (req: Got, { settings }: { settings: Settings }): Promise<AutocompleteResponse> {
  const response = await req.get<ListResponse>('https://beta-api.customer.io/v1/api/segments', {
    prefixUrl: '',
    headers: {
      Authorization: `Bearer ${settings.appApiKey}`
    }
  })

  const items = response.body.segments.map((segment) => ({
    label: segment.name,
    value: segment.id
  }))

  return {
    body: {
      data: items,
      pagination: {}
    }
  }
}

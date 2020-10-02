import { Got } from 'got'
import { AutocompleteResponse } from '@/lib/autocomplete'

interface ListResponse {
  result: ListItem[]
  _metadata: {
    next?: string
  }
}

interface ListItem {
  id: string
  name: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function(req: Got, { page }: any): Promise<AutocompleteResponse> {
  const response = await req<ListResponse>('marketing/lists', {
    searchParams: {
      page_token: page
    }
  })

  const items = response.body.result.map(list => ({
    label: list.name,
    value: list.id
  }))

  let nextPage

  if (response.body._metadata.next) {
    nextPage = new URL(response.body._metadata.next).searchParams.get('page_token')
  }

  return {
    body: {
      data: items,
      pagination: {
        nextPage: nextPage ?? undefined
      }
    }
  }
}

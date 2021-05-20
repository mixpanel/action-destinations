import { DecoratedResponse as Response } from '@segment/actions-core'
import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http'
import { redactUnsafeRequestHeaders, redactUnsafeResponseHeaders } from '../lib/redact'

export interface EventTesterRequest {
  request: RequestToDestination
  response: ResponseFromDestination
}

export interface RequestToDestination {
  url: string
  headers: OutgoingHttpHeaders
  method: string
  body: unknown
}

export interface ResponseFromDestination {
  statusCode: number
  statusMessage?: string
  headers: IncomingHttpHeaders
  body: unknown
}

export default async function getEventTesterData(responses: Response[]): Promise<EventTesterRequest[]> {
  const requests: EventTesterRequest[] = []

  for (const response of responses) {
    requests.push({
      request: await summarizeRequest(response),
      response: summarizeResponse(response)
    })
  }

  return requests
}

async function summarizeRequest(response: Response): Promise<RequestToDestination> {
  const request = response.request.clone()
  const data = await request.text()

  return {
    url: request.url,
    method: request.method,
    headers: redactUnsafeRequestHeaders(request.headers),
    body: data ?? ''
  }
}

function summarizeResponse(response: Response): ResponseFromDestination {
  return {
    statusCode: response.status,
    statusMessage: response.statusText,
    headers: redactUnsafeResponseHeaders(response.headers),
    body: response.data ?? response
  }
}

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

export default function getEventTesterData(responses: Response[]): EventTesterRequest[] {
  const requests: EventTesterRequest[] = []

  for (const response of responses) {
    requests.push({
      request: summarizeRequest(response),
      response: summarizeResponse(response)
    })
  }

  return requests
}

function summarizeRequest(response: Response): RequestToDestination {
  const request = response.request

  return {
    url: request.url,
    method: request.method,
    headers: redactUnsafeRequestHeaders(request.headers),
    body: request.body ?? ''
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

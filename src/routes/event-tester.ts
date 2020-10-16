import { Response } from 'got'
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

export default function getEventTesterData(responses: Response<unknown>[]): EventTesterRequest[] {
  const requests: EventTesterRequest[] = []

  for (const response of responses) {
    requests.push({
      request: summarizeRequest(response),
      response: summarizeResponse(response)
    })
  }

  return requests
}

function summarizeRequest(response: Response<unknown>): RequestToDestination {
  const request = response.request

  // This is needed because `request.options.body` does not contain the actual body sent in the request
  const symbol = Object.getOwnPropertySymbols(request).find(s => String(s) === 'Symbol(body)')

  return {
    url: request.requestUrl,
    method: request.options.method,
    headers: redactUnsafeRequestHeaders(request.options.headers),
    // eslint-disable-next-line
    // @ts-ignore
    body: symbol ? request[symbol] : ''
  }
}

function summarizeResponse(response: Response<unknown>): ResponseFromDestination {
  return {
    statusCode: response.statusCode,
    statusMessage: response.statusMessage,
    headers: redactUnsafeResponseHeaders(response.headers),
    body: response.body
  }
}

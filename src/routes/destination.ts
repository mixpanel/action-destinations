import { Request, Response } from 'express'
import { HttpError, UnprocessableEntity } from 'http-errors'
import { IncomingHttpHeaders } from 'http'
import getDestinationBySlug from '../destinations'
import idToSlug from './id-to-slug'
import MIMEType from 'whatwg-mimetype'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJsonHeader(headers: IncomingHttpHeaders, header: string, fallback = null): any {
  const raw = headers[header]
  if (!raw || Array.isArray(raw)) {
    return fallback
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new UnprocessableEntity(`Invalid header "${header.replace('centrifuge-', '')}": ${error.message}`)
  }
}

function parseContentType(req: Request): MIMEType {
  const contentType = req.headers['content-type']

  if (contentType) {
    const mimeType = MIMEType.parse(contentType)
    if (mimeType) {
      return mimeType
    }
  }

  return new MIMEType('application/octet-stream')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleHttp(req: Request): Promise<any> {
  const id = req.params.destinationId
  const event = req.body
  const settings = parseJsonHeader(req.headers, 'centrifuge-settings')

  // Try to map the id param to a slug, or treat it as the slug (easier local testing)
  const slug = idToSlug[id] || id
  const destination = getDestinationBySlug(slug)

  const results = await destination.onEvent(event, settings)

  return results
}

function isCloudEvent(contentType: MIMEType): boolean {
  return contentType.type === 'application' && contentType.subtype.startsWith('cloudevents')
}

function isBatchedCloudEvent(contentType: MIMEType): boolean {
  return contentType.type === 'application' && contentType.subtype === 'cloudevents-batch+json'
}

function isStructuredCloudEvent(contentType: MIMEType): boolean {
  return contentType.type === 'application' && contentType.subtype === 'cloudevents+json'
}

interface CloudEvent {
  id: string
  source: string
  destination: string
  specversion: string
  type: string
  data: object
  settings: object
}

interface CloudEventResponse {
  id: string
  source: string
  destination: string
  specversion: string
  type: string
  time: string
  status: number
  data: object
  errortype?: string
  errormessage?: string
}

function constructCloudSuccess(cloudEvent: CloudEvent, data: object): CloudEventResponse {
  return {
    id: cloudEvent.id,
    source: cloudEvent.source,
    destination: cloudEvent.destination,
    specversion: '1.0',
    type: 'com.segment.event.ack',
    time: new Date().toISOString(),
    status: 201,
    data
  }
}

function constructCloudError(cloudEvent: CloudEvent, error: HttpError): CloudEventResponse {
  const statusCode = (error && error.status) || 500

  return {
    id: cloudEvent.id,
    source: cloudEvent.source,
    destination: cloudEvent.destination,
    specversion: '1.0',
    type: 'com.segment.event.ack',
    time: new Date().toISOString(),
    status: statusCode,
    data: {},
    errortype: 'MESSAGE_REJECTED',
    errormessage: String((error && error.message) || '')
  }
}

async function handleCloudEvent(destinationId: string, cloudEvent: CloudEvent): Promise<CloudEventResponse> {
  const { data, settings } = cloudEvent

  try {
    const slug = idToSlug[destinationId]
    const destination = getDestinationBySlug(slug)
    const result = await destination.onEvent(data, settings)
    return constructCloudSuccess(cloudEvent, result)
  } catch (err) {
    return constructCloudError(cloudEvent, err)
  }
}

async function handleCloudEventBatch(destinationId: string, batch: CloudEvent[]): Promise<CloudEventResponse[]> {
  const promises = batch.map(event => handleCloudEvent(destinationId, event))

  const results = await Promise.all(promises)

  return results
}

// TODO support quasar
// TODO support tracing
// TODO support `deadline`/timeout?
// TODO support `attempt` metrics?
// TODO support `debug`?
// TODO support `headers['centrifuge-features']`?
async function destination(req: Request, res: Response): Promise<void> {
  const destinationId = req.params.destinationId
  const contentType = parseContentType(req)

  if (isCloudEvent(contentType)) {
    if (isBatchedCloudEvent(contentType)) {
      const result = await handleCloudEventBatch(destinationId, req.body)
      res.set('Content-Type', 'application/cloudevents-batch+json; charset=utf-8')
      res.status(201)
      res.send(result)
      return
    }

    if (isStructuredCloudEvent(contentType)) {
      const result = await handleCloudEvent(destinationId, req.body)
      res.set('Content-Type', 'application/cloudevent+json; charset=utf-8')
      res.status(result.status)
      res.send(result)
      return
    }
  }

  // This will happen when the cloudevents flagon is disabled or when sending the event
  // via the "Segment Integration" plugin
  const result = await handleHttp(req)
  res.status(200)
  res.send(result)
}

export default destination

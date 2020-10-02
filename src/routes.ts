import express from 'express'
import { NotImplemented, UnprocessableEntity } from 'http-errors'
import { IncomingHttpHeaders } from 'http'
import getDestinationBySlug from './destinations'
import asyncHandler from './lib/async-handler'

const router = express.Router()

const idToSlug: { [key: string]: string } = {
  '5f736bae438ce7d3da5a7baa': 'slack',
  '5f762c6225602421a54001b4': 'sendgrid'
}

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

router.post(
  '/actions/:destinationId',
  // TODO support application/cloudevents+json` or `application/*+json`
  express.json({ type: 'application/*' }),
  asyncHandler(async (req, res) => {
    const id = req.params.destinationId
    // Cloud Events send as `data`, but Segment Integrations send as the request body itself
    // Assume the former, if possible, and fallback to the latter
    // TODO make this more robust (based on the inbound content-type?)
    const event = req.body.data || req.body
    const settings = req.body.settings || parseJsonHeader(req.headers, 'centrifuge-settings')

    // TODO support quasar
    // TODO support tracing
    // TODO support `deadline`/timeout?
    // TODO support `attempt` metrics?
    // TODO support `debug`?
    // TODO support `headers['centrifuge-features']`?

    // Try to map the id param to a slug, or treat it as the slug (easier local testing)
    const slug = idToSlug[id] || id
    const destination = getDestinationBySlug(slug)
    if (!destination) {
      throw new NotImplemented(`${id} is not implemented.`)
    }

    const results = await destination.onEvent(event, settings)

    res.status(200).json(results)
  })
)

export default router

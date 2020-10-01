const express = require('express')
const { NotImplemented, UnprocessableEntity } = require('http-errors')
const destinations = require('./destinations/destinations')

const router = express.Router()

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

function parseJsonHeader(headers, header, fallback = null) {
  const raw = headers[header]
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new UnprocessableEntity(
      `Invalid header "${header.replace('centrifuge-', '')}": ${error.message}`
    )
  }
}

const idToSlug = {
  '5f736bae438ce7d3da5a7baa': 'slack'
}

router.post(
  '/actions/:destinationId',
  // TODO support application/cloudevents+json` or `application/*+json`
  express.json({ type: 'application/*' }),
  asyncHandler(async (req, res, _next) => {
    const id = req.params.destinationId
    // Cloud Events send as `data`, but Segment Integrations send as the request body itself
    // Assume the former, if possible, and fallback to the latter
    // TODO make this more robust (based on the inbound content-type?)
    const event = req.body.data || req.body
    const settings =
      req.body.settings || parseJsonHeader(req.headers, 'centrifuge-settings')

    // TODO support quasar
    // TODO support tracing
    // TODO support `deadline`/timeout?
    // TODO support `attempt` metrics?
    // TODO support `debug`?
    // TODO support `headers['centrifuge-features']`?

    // Try to map the id param to a slug, or treat it as the slug (easier local testing)
    const slug = idToSlug[id] || id
    const destination = destinations[slug]
    if (!destination) {
      throw new NotImplemented(`${slug} is not implemented.`)
    }

    const results = await destination.onEvent(event, settings)
    res.status(200).json(results)
  })
)

module.exports = router

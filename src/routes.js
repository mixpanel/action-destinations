const express = require('express')
const { NotImplemented } = require('http-errors')
const destinations = require('./destinations/destinations')

const router = express.Router()

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

const idToSlug = {
  '5f736bae438ce7d3da5a7baa': 'slack'
}

router.post(
  '/actions/:destinationId',
  asyncHandler(async (req, res, _next) => {
    const id = req.params.destinationId
    const event = req.body.data
    const settings = req.body.settings

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

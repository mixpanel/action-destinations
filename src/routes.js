const express = require('express')
const { NotImplemented } = require('http-errors')
const destinations = require('./destinations/destinations')

const router = express.Router()

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

router.post(
  '/actions/:destinationSlug',
  asyncHandler(async (req, res, _next) => {
    const slug = req.params.destinationSlug
    const event = req.body.data
    const settings = req.body.settings

    // Prune quasar properties
    delete event.__quasar__controlRequests

    // TODO support quasar
    // TODO support tracing
    // TODO support `deadline`/timeout?
    // TODO support `attempt` metrics?
    // TODO support `debug`?
    // TODO support `headers['centrifuge-features']`?

    const destination = destinations[slug]
    if (!destination) {
      throw new NotImplemented(`${slug} is not implemented.`)
    }

    const results = await destination.onEvent(event, settings)
    res.status(200).json(results)
  })
)

module.exports = router

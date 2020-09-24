const http = require('http')
const { once } = require('lodash')
const blockedStats = require('@segment/blocked-stats')
const app = require('./app')
const logger = require('./lib/logger')
const stats = require('./lib/stats')
const { PORT } = require('./config')

// Track blocked event loop metrics
blockedStats(logger, stats)

const server = http.createServer(app).listen(PORT, () => {
  logger.info(`Listening at http://localhost:${PORT}`)
})

const gracefulShutdown = once(exitCode => {
  logger.info('Server stopping...')

  // Stop receiving new requests, allowing inflight requests to finish
  server.close(() => {
    logger.info('Server stopped')
    // Leave time for logging / error capture
    setTimeout(() => process.exit(exitCode), 300)
  })

  // Forcibly shutdown after 8 seconds (Docker forcibly kills after 10 seconds)
  setTimeout(() => {
    logger.crit('Forcibly shutting down')
    // Leave time for logging / error capture
    setTimeout(() => process.exit(1), 300)
  }, 8000)
})

function handleUncaught(error, crashType) {
  error.crashType = crashType
  stats.increment('crash', 1, [`type:${crashType}`])
  logger.crit('😱  Server crashed', error)

  // Gracefully shutdown the server on uncaught errors to allow inflight requests to finish
  gracefulShutdown(1)
}

process.on('uncaughtException', error => {
  handleUncaught(error, 'uncaughtException')
})
process.on('unhandledRejection', error => {
  handleUncaught(error, 'unhandledRejection')
})

// Termination signal sent by Docker on stop
process.on('SIGTERM', () => gracefulShutdown(0))
// Interrupt signal sent by Ctrl+C
process.on('SIGINT', () => gracefulShutdown(0))

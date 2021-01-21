import { Express } from 'express'
import http from 'http'
import { once } from 'lodash'
import * as Sentry from '@sentry/node'
import * as SentryIntegrations from '@sentry/integrations'
import blockedStats from '@segment/blocked-stats'
import logger from '@/lib/logger'
import stats from '@/lib/stats'
import { NODE_ENV, SENTRY_DSN } from '@/config'

Sentry.init({
  dsn: SENTRY_DSN,
  environment: NODE_ENV,
  integrations: [
    new SentryIntegrations.Dedupe(),
    new SentryIntegrations.ExtraErrorData({
      depth: 4
    })
  ]
})

// Track blocked event loop metrics
blockedStats(logger, stats)

let server: http.Server

export function startServer(app: Express, port: number) {
  server = http.createServer(app)

  server.on('error', (err: Error) => {
    logger.error(`Server error: ${err.message}`, err)
  })

  server.listen(port, () => {
    logger.info(`Listening at http://localhost:${port}`)
  })

  return server
}

const gracefulShutdown = once((exitCode) => {
  logger.info('Server stopping...')

  // Stop receiving new requests, allowing inflight requests to finish
  if (server) {
    server.close(() => {
      logger.info('Server stopped')
      // Leave time for logging / error capture
      setTimeout(() => process.exit(exitCode), 300)
    })
  }

  // Forcibly shutdown after 8 seconds (Docker forcibly kills after 10 seconds)
  setTimeout(() => {
    logger.crit('Forcibly shutting down')
    // Leave time for logging / error capture
    setTimeout(() => process.exit(1), 300)
  }, 8000)
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleUncaught(error: any, crashType: string): void {
  error.crashType = crashType
  Sentry.withScope((scope) => {
    scope.setTag('crashType', crashType)
    Sentry.captureException(error)
  })

  stats.increment('crash', 1, [`type:${crashType}`])
  logger.crit('😱  Server crashed', error)

  // Gracefully shutdown the server on uncaught errors to allow inflight requests to finish
  gracefulShutdown(1)
}

process.on('uncaughtException', (error) => {
  handleUncaught(error, 'uncaughtException')
})
process.on('unhandledRejection', (error) => {
  handleUncaught(error, 'unhandledRejection')
})

// Termination signal sent by Docker on stop
process.on('SIGTERM', () => gracefulShutdown(0))
// Interrupt signal sent by Ctrl+C
process.on('SIGINT', () => gracefulShutdown(0))

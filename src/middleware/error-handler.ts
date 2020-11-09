import * as Sentry from '@sentry/node'
import { ErrorRequestHandler } from 'express'
import { NODE_ENV } from '../config'
import logger from '../lib/logger'
import stats from '../lib/stats'

/** Catch all error handler */
const errorHandler: ErrorRequestHandler = (error, req, res, _next): void => {
  const status = error.statusCode || error.status || 500
  const payload = { message: 'Internal server error', status }

  // Return user errors and don't log them
  // E.g: validation errors, JSON parsing errors, payload too large errors
  if (error.expose && status >= 400 && status <= 499) {
    payload.message = error.message
  } else {
    // Decorate the error with useful info to aid debugging
    error.referer = req.headers.referer
    error.userAgent = req.headers['user-agent']
    error.method = req.method
    error.path = req.path
    error.route = req.route ? req.route.path : 'unknown'

    logger.error('🤦  Server Error', error)
    stats.increment('errors', 1, [`path:${req.path}`])
  }

  // Only return the error message in development
  if (NODE_ENV === 'development' || NODE_ENV === 'test') {
    payload.message = error.message || error
  } else {
    Sentry.captureException(error)
  }

  res.status(status).json(payload)
}

export default errorHandler

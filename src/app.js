const express = require('express')
const logger = require('./lib/logger')
const stats = require('./lib/stats')
const routes = require('./routes')
const { NODE_ENV } = require('./config')

const app = express()

// Causes `req.ip` to be set to the `X-Forwarded-For` header value, which is set by the ELB
app.set('trust proxy', true)

// Endpoint used by ECS to check that the server is still alive
app.get('/health', (_req, res) => {
  res.status(204).end()
})

// Request metrics/logging
// Positioned first so that requests with JSON errors still get logged
app.use(stats.middleware())

app.use((req, res, next) => {
  const start = Date.now()

  const afterResponse = () => {
    res.removeListener('finish', afterResponse)
    res.removeListener('close', afterResponse)

    const duration = Date.now() - start
    const statusCode = res.statusCode

    const details = {
      duration,
      ip: req.ip,
      method: req.method,
      path: req.path,
      statusCode,
      headers: req.headers,
      body: req.body
    }

    if (statusCode >= 500) {
      logger.error(
        `🚨 ${statusCode} ${req.method} ${req.path} - ${duration}ms`,
        details
      )
    } else {
      logger.info(
        `✅ ${statusCode} ${req.method} ${req.path} - ${duration}ms`,
        details
      )
    }
  }

  res.once('finish', afterResponse)
  res.once('close', afterResponse)

  next()
})

app.use(routes)

// Catch all error handler
app.use((error, req, res, _next) => {
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
  }

  res.status(status).json(payload)
})

module.exports = app

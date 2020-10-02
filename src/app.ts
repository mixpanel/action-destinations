import express from 'express'
import stats from './lib/stats'
import routes from './routes'
import requestLogger from './middleware/request-logger'
import errorHandler from './middleware/error-handler'

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

app.use(requestLogger)

app.use(routes)

app.use(errorHandler)

export default app

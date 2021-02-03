import './aliases'
import './lib/patch-http'
import express from 'express'
import routes from './routes'
import core from './middleware/core'
import errorHandler from './middleware/error-handler'
import { startServer } from './boot'
import { PORT } from './config'

export const app = express()

app.disable('x-powered-by')

// Causes `req.ip` to be set to the `X-Forwarded-For` header value, which is set by the ELB
app.set('trust proxy', true)

// Endpoint used by ECS to check that the server is still alive
app.get('/health', (_req, res) => {
  res.status(204).end()
})

app.use(core)

app.use(routes)

app.use(errorHandler)

export default startServer(app, Number(PORT || 3000))

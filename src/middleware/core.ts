import { RequestHandler, Request, Response } from 'express'
import { once, get } from 'lodash'
import * as Sentry from '@sentry/node'
import Context from '../lib/context'
import logger from '../lib/logger'
import stats from '../lib/stats'

interface RecordErrorParams {
  error: unknown
  req: Request
}

/**
 * In the rare case that the core middleware errors, this function will record what information we can
 * while minimising the potential for further errors.
 * */
function recordError({ error, req }: RecordErrorParams): void {
  stats.increment('error', 1, ['endpoint:core-middleware'])
  logger.crit('🔥 Critical core middleware error', {
    error,
    http_req_method: req.method,
    http_req_path: req.path,
    http_req_query: req.query,
    http_req_ip: req.ip
  })
  Sentry.captureException(error)
}

interface CreateAfterResponseCallbackParams {
  req: Request
  res: Response
  ctx: Context
  requestStartedAt: bigint
}

function createAfterResponseCallback(params: CreateAfterResponseCallbackParams): () => void {
  const { req, res, ctx, requestStartedAt } = params

  return once((): void => {
    try {
      const requestEndedAt = process.hrtime.bigint()
      const duration = Number(requestEndedAt - requestStartedAt) / 1000000
      const routePath = req.path
      const endpoint = `${req.method} ${routePath}`
      const error = ctx.getError()
      // When using compression middleware, _contentLength does not get set so we need to check the headers
      const responseSize: number | undefined = parseFloat(res.getHeader('Content-Length') || get(res, '_contentLength'))
      // Don't log metrics for the health check endpoint unless it's an error
      const shouldLogMetrics = Boolean(error) || routePath !== '/healthcheck'

      ctx.set('http_res_status', res.statusCode)
      ctx.set('http_res_headers', res.getHeaders())
      ctx.set('http_res_size', responseSize)

      ctx.set('req_route', routePath)
      ctx.set('req_duration', duration)

      if (shouldLogMetrics) {
        ctx.sendMetrics()
      }

      if (error) {
        let errorMessage = 'Unsupported error'

        if (typeof error === 'string') {
          errorMessage = error
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        ctx.log('error', `🚨 ${res.statusCode} ${endpoint} - ${Math.round(duration)}ms - ${errorMessage}`)
      } else {
        if (shouldLogMetrics) {
          ctx.log('info', `💬 ${res.statusCode} ${endpoint} - ${Math.round(duration)}ms`)
        }
      }
    } catch (error) {
      recordError({ error, req })
    }
  })
}

/** The core functionality of the server that handles things like request context creation and request level logging/metrics */
const coreMiddleware: RequestHandler = (req, res, next) => {
  try {
    const requestStartedAt = process.hrtime.bigint()

    const ctx = new Context()
    req.context = ctx

    ctx.set('http_req_method', req.method)
    ctx.set('http_req_path', req.path)
    ctx.set('http_req_query', req.query)
    ctx.set('http_req_headers', req.headers)
    ctx.set('http_req_ip', req.ip)

    const afterResponse = createAfterResponseCallback({
      req,
      res,
      ctx,
      requestStartedAt
    })

    res.once('finish', afterResponse)
    res.once('close', afterResponse)

    next()
  } catch (error) {
    recordError({ error, req })
    next(error)
  }
}

export default coreMiddleware

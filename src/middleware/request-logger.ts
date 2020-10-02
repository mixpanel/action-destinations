import { RequestHandler } from 'express'
import logger from '../lib/logger'

const requestLogger: RequestHandler = (req, res, next): void => {
  const start = Date.now()

  const afterResponse = (): void => {
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
      logger.error(`🚨 ${statusCode} ${req.method} ${req.path} - ${duration}ms`, details)
    } else {
      logger.info(`✅ ${statusCode} ${req.method} ${req.path} - ${duration}ms`, details)
    }
  }

  res.once('finish', afterResponse)
  res.once('close', afterResponse)

  next()
}

export default requestLogger

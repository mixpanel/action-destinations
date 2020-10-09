import { Logger } from 'ecs-logs-js'
import { NODE_ENV, LOG_LEVEL } from '../config'

export { LEVEL } from 'ecs-logs-js'

const logger = new Logger({
  level: LOG_LEVEL || 'debug',
  devMode: NODE_ENV === 'development'
})

export default logger

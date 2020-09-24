const { Logger } = require('ecs-logs-js')
const { NODE_ENV, LOG_LEVEL } = require('../config')

const logger = new Logger({
  level: LOG_LEVEL,
  devMode: NODE_ENV === 'development'
})

module.exports = logger

const NODE_ENV = process.env.NODE_ENV || 'development'
const PORT = process.env.PORT || 3000

// Suppress the logs when running the tests
const LOG_LEVEL =
  NODE_ENV === 'test' ? 'crit' : process.env.LOG_LEVEL || 'debug'
const DATADOG_AGENT_ADDR = process.env.DATADOG_AGENT_ADDR || 'localhost:8125'

module.exports = {
  DATADOG_AGENT_ADDR,
  LOG_LEVEL,
  NODE_ENV,
  PORT
}

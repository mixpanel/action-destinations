const Stats = require('@segment/express-stats')
const { NODE_ENV, DATADOG_AGENT_ADDR } = require('../config')
const pkg = require('../../package.json')

module.exports = new Stats({
  statsdAddr: DATADOG_AGENT_ADDR,
  tags: [`env:${NODE_ENV}`],
  name: pkg.name
})

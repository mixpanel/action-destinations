import Stats from '@segment/express-stats'
import { NODE_ENV, STATS_PREFIX, DATADOG_AGENT_ADDR } from '../config'

export default new Stats({
  statsdAddr: DATADOG_AGENT_ADDR,
  tags: [`env:${NODE_ENV}`],
  name: STATS_PREFIX
})

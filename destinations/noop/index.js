const { destination } = require('../../lib/destination-kit')

module.exports = destination(require('./destination.json'))
  // TODO do this automatically in a way that works with webpack
  .partnerAction('noop', require('./noop'))
  .handler()

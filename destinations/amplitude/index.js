const { destination } = require('../../lib/destination-kit')

module.exports = destination(require('./destination.json'))
  .partnerAction('trackUser', require('./trackUser'))
  .partnerAction('identifyUser', require('./identifyUser'))
  .partnerAction('annotateChart', require('./annotateChart'))

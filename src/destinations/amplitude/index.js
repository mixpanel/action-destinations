const { destination } = require('../../lib/destination-kit')

module.exports = destination(require('./destination.json'))
  .validateSettings(require('./settings.schema.json'))
  .partnerAction('trackUser', require('./trackUser'))
  .partnerAction('identifyUser', require('./identifyUser'))
  .partnerAction('annotateChart', require('./annotateChart'))
  .partnerAction('deleteUser', require('./deleteUser'))

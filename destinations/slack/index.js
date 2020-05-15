const destination = require('./destination.json')
const settings = require('./settings.json')

module.exports.handleEvent = (event, s) => {
  console.log('event', event)
  console.log('func settings', s)
  console.log('destination config', destination)
  console.log('destination settings', settings)
  throw new Error('test')
}


const destination = require('./destination.json')
const destSettings = require('./settings.json')

const postToChannel = require('./postToChannel')

export default function (event, settings) {
  console.log('event', event)
  console.log('func settings', settings)
  console.log('destination config', destination)
  console.log('destination settings', destSettings)
  throw new Error('test')
}

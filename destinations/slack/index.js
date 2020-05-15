
const destination = require('./destination.json')
const settings = require('./settings.json')

const postToChannel = require('./postToChannel')

function handleEvent (event, s) {
  console.log('event', event)
  console.log('func settings', s)
  console.log('destination config', destination)
  console.log('destination settings', settings)

  throw new Error('test')
}

async function onTrack (event, settings) { return handleEvent(event, settings) }
async function onIdentify (event, settings) { return handleEvent(event, settings) }
async function onGroup (event, settings) { return handleEvent(event, settings) }
async function onPage (event, settings) { return handleEvent(event, settings) }
async function onScreen (event, settings) { return handleEvent(event, settings) }
async function onAlias (event, settings) { return handleEvent(event, settings) }
async function onDelete (event, settings) { return handleEvent(event, settings) }

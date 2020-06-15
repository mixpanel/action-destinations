const { grpc } = require('grpc-web-client')
const { NodeHttpTransport } = require('grpc-web-node-http-transport')
grpc.setDefaultTransport(NodeHttpTransport())

const { FunctionsClient } = require('@segment/connections-api/functions/v1beta/functions_pb_service')
const functions = new FunctionsClient('http://connections-service.segment.local')

const { compile } = require('./compile')

// Hard-coded to `tyson` workspace for now.
const WORKSPACE_ID = 'lmD77Nebzz'

// Hard-coded to sloth@segment.com for now.
const METADATA = {
  'x-subject-id': 'users/i2VTJURQprNfqdwjLFPWYx',
  'x-subject-scope': 'workspace'
}

// Cheap hack to identify and find our functions.
const FUNCTION_PREFIX = 'Fab 5 '

// We'll probably want our own buildpack in the future. For now, we'll use the
// one Destination Functions use.
const FUNCTION_BUILDPACK = 'boreal'

// listFunctions returns a promise that resolves to array of Fab 5 functions.
function listFunctions () {
  return new Promise((resolve, reject) => {
    const { ListFunctionsRequest } = require('@segment/connections-api/functions/v1beta/functions_pb')

    const req = new ListFunctionsRequest()
    req.setWorkspaceId(WORKSPACE_ID)
    req.setType('DESTINATION')

    functions.list(req, METADATA, (err, resp) => {
      if (err) reject(err)
      resolve(
        resp.toObject().functionsList
          .filter((f) => f.displayName.startsWith(FUNCTION_PREFIX))
      )
    })
  })
}

// compileDestinations returns a promise that resolves to an array of compiled
// destinations.
function compileDestinations () {
  const destinations = require('./destinations')()
  return Promise.all(destinations.map(d => compileDestination(d)))
}

async function compileDestination (destination) {
  return {
    ...destination,
    compiled: await compile(destination.path)
  }
}

const functionSettingTypes = {
  string: 'string',
  array: 'array'
}

function functionSettingType (type) {
  const fnSettingType = functionSettingTypes[type]
  if (!fnSettingType) {
    throw new Error(`${type} setting type not implemented`)
  }
  return fnSettingType
}

function metadataForDescriptionField (destination) {
  const { path, compiled, ...cleanDestination } = destination
  cleanDestination.partnerActions = cleanDestination.partnerActions.map(action => {
    const { code, ...cleanAction } = action
    return cleanAction
  })
  return JSON.stringify(cleanDestination)
}

function functionSettings (destination) {
  const { FunctionSetting } = require('@segment/connections-api/functions/v1beta/functions_pb')

  const settings = []

  const subsSetting = new FunctionSetting()
  subsSetting.setType('string')
  subsSetting.setLabel('Subscriptions')
  subsSetting.setName('subscriptions')
  subsSetting.setDescription('\\[{"subscribe":{"type":"track"},"partnerAction":"postToChannel","mapping":{...}}]')
  subsSetting.setRequired(true)
  settings.push(subsSetting)

  for (const slug in destination.settings.properties) {
    const setting = destination.settings.properties[slug]
    const s = new FunctionSetting()
    s.setType(functionSettingType(setting.type))
    s.setLabel(setting.title)
    s.setName(slug)
    s.setRequired(true)
    s.setDescription(setting.description)
    settings.push(s)
  }

  const metaSetting = new FunctionSetting()
  metaSetting.setType('string')
  metaSetting.setLabel('Destination Metadata')
  metaSetting.setName('metadata')
  metaSetting.setDescription(metadataForDescriptionField(destination))
  settings.push(metaSetting)

  return settings
}

function createFunction (name, destination) {
  console.log(`Creating function ${name} (${destination.compiled.length} bytes)`)

  const { Function: Fn, CreateFunctionRequest } = require('@segment/connections-api/functions/v1beta/functions_pb')

  const fn = new Fn()
  fn.setDisplayName(name)
  fn.setBuildpack(FUNCTION_BUILDPACK)
  fn.setCode(destination.compiled)
  fn.setSettingsList(functionSettings(destination))

  const req = new CreateFunctionRequest()
  req.setWorkspaceId(WORKSPACE_ID)
  req.setType('DESTINATION')
  req.setFunction(fn)

  return new Promise((resolve, reject) => {
    functions.create(req, METADATA, (err, resp) => {
      if (err) return reject(new Error(`${name}: ${err.message}`))
      resolve(resp.toObject())
    })
  })
}

function updateFunction (id, destination) {
  console.log(`Updating function ${id} (${destination.compiled.length} bytes)`)

  const { Function: Fn, UpdateFunctionRequest } = require('@segment/connections-api/functions/v1beta/functions_pb')
  const { FieldMask } = require('google-protobuf/google/protobuf/field_mask_pb.js')

  const fn = new Fn()
  fn.setId(id)
  fn.setWorkspaceId(WORKSPACE_ID)
  fn.setBuildpack(FUNCTION_BUILDPACK)
  fn.setCode(destination.compiled)
  fn.setSettingsList(functionSettings(destination))

  const mask = new FieldMask()
  mask.setPathsList(['function.code', 'function.buildpack', 'function.settings'])

  const req = new UpdateFunctionRequest()
  req.setFunction(fn)
  req.setUpdateMask(mask)

  return new Promise((resolve, reject) => {
    functions.update(req, METADATA, (err, resp) => {
      if (err) return reject(new Error(`${destination.name} (${id}): ${err.message}`))
      resolve(resp.toObject())
    })
  })
}

Promise.all([
  listFunctions(),
  compileDestinations()
]).then(([functions, destinations]) => {
  const fnName = (slug) => `${FUNCTION_PREFIX}${slug}`
  const fnWithSlug = (slug) => functions.find((f) => f.displayName.startsWith(fnName(slug)))

  const createDestinations = destinations.filter((d) => !fnWithSlug(d.slug))
  const updateDestinations = destinations.filter((d) => !createDestinations.includes(d))

  return Promise.allSettled([
    ...createDestinations.map((d) => createFunction(fnName(d.slug), d)),
    ...updateDestinations.map((d) => updateFunction(fnWithSlug(d.slug).id, d))
  ])
}).then((results) => {
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      console.log(`Deployed: ${result.value.displayName} (${result.value.id})`)
    } else {
      console.log(`FAILED: ${result.reason}`)
    }
  })
})

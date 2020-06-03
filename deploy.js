const { grpc } = require('grpc-web-client')
const { NodeHttpTransport } = require('grpc-web-node-http-transport')
grpc.setDefaultTransport(NodeHttpTransport())

const { FunctionsClient } = require('@segment/connections-api/functions/v1beta/functions_pb_service')
const functions = new FunctionsClient('http://connections-service.segment.local')

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
  const { readdirSync } = require('fs')
  const { join, resolve } = require('path')
  const { compile } = require('./compile')

  const root = './destinations'

  return Promise.all(
    readdirSync(root, { withFileTypes: true })
      .filter(sub => sub.isDirectory())
      .map(async (f) => {
        const path = resolve(join(root, f.name))
        const destination = await compile(path)
        return ({
          slug: f.name,
          ...destination
        })
      })
  )
}

const functionSettingTypes = {
  string: 'string',
  strings: 'array'
}

function functionSettingType (type) {
  const fnSettingType = functionSettingTypes[type]
  if (!fnSettingType) {
    throw new Error(`${type} setting type not implemented`)
  }
  return fnSettingType
}

function functionSettings (destination) {
  const { FunctionSetting } = require('@segment/connections-api/functions/v1beta/functions_pb')

  const settings = []

  // Base settings
  const subsSetting = new FunctionSetting()
  subsSetting.setType('string')
  subsSetting.setLabel('Subscriptions')
  subsSetting.setName('subscriptions')
  subsSetting.setDescription('[{"subscribe":{"type":"track"},"partnerAction":"postToChannel"}]')
  settings.push(subsSetting)

  destination.settings.forEach(setting => {
    const s = new FunctionSetting()
    s.setType(functionSettingType(setting.type))
    s.setLabel(setting.label)
    s.setName(setting.slug)
    s.setRequired(true)
    s.setDescription(setting.description)
    settings.push(s)
  })

  // Per-action settings
  destination.actions.forEach(action => {
    const mapping = new FunctionSetting()
    mapping.setType('string')
    mapping.setLabel(`${action.slug}: Mapping JSON`)
    mapping.setName(`${action.slug}Mapping`)
    mapping.setRequired(true)
    mapping.setDescription('{"@field": "example.here"}')
    settings.push(mapping)

    action.settings.forEach(setting => {
      const s = new FunctionSetting()

      s.setLabel(`${action.slug}: ${setting.label}`)
      s.setDescription(setting.description)
      s.setName(`${action.slug}${setting.slug}`)
      s.setType(functionSettingType(setting.type))
      s.setRequired(true)
      settings.push(s)
    })
  })

  return settings
}

function createFunction (name, destination) {
  console.log(`Creating function ${name} (${destination.code.length} bytes)`)

  const { Function: Fn, CreateFunctionRequest } = require('@segment/connections-api/functions/v1beta/functions_pb')

  const fn = new Fn()
  fn.setDisplayName(name)
  fn.setBuildpack(FUNCTION_BUILDPACK)
  fn.setCode(destination.code)
  fn.setSettingsList(functionSettings(destination))

  const req = new CreateFunctionRequest()
  req.setWorkspaceId(WORKSPACE_ID)
  req.setType('DESTINATION')
  req.setFunction(fn)

  return new Promise((resolve, reject) => {
    functions.create(req, METADATA, (err, resp) => {
      if (err) return reject(err)
      resolve(resp.toObject())
    })
  })
}

function updateFunction (id, destination) {
  console.log(`Updating function ${id} (${destination.code.length} bytes)`)

  const { Function: Fn, UpdateFunctionRequest } = require('@segment/connections-api/functions/v1beta/functions_pb')
  const { FieldMask } = require('google-protobuf/google/protobuf/field_mask_pb.js')

  const fn = new Fn()
  fn.setId(id)
  fn.setWorkspaceId(WORKSPACE_ID)
  fn.setBuildpack(FUNCTION_BUILDPACK)
  fn.setCode(destination.code)
  fn.setSettingsList(functionSettings(destination))

  const mask = new FieldMask()
  mask.setPathsList(['function.code', 'function.buildpack', 'function.settings'])

  const req = new UpdateFunctionRequest()
  req.setFunction(fn)
  req.setUpdateMask(mask)

  return new Promise((resolve, reject) => {
    functions.update(req, METADATA, (err, resp) => {
      if (err) return reject(err)
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

  return Promise.all([
    ...createDestinations.map((d) => createFunction(fnName(d.slug), d)),
    ...updateDestinations.map((d) => updateFunction(fnWithSlug(d.slug).id, d))
  ])
}).then((functions) => {
  functions.forEach((fn) => {
    console.log(`Deployed: ${fn.displayName} (${fn.id})`)
  })
}).catch((reason) =>
  console.log('ERROR', reason)
)

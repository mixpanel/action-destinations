const { grpc } = require('grpc-web-client')
const { NodeHttpTransport } = require('grpc-web-node-http-transport')
grpc.setDefaultTransport(NodeHttpTransport())

const { FunctionsClient } = require('@segment/connections-api/functions/v1beta/functions_pb_service')
const functions = new FunctionsClient('http://connections-service.segment.local')

const { compile } = require('../../compile')

// Hard-coded to sloth@segment.com for now.
const METADATA = {
  'x-subject-id': 'users/i2VTJURQprNfqdwjLFPWYx',
  'x-subject-scope': 'workspace'
}

// Cheap hack to identify and find our functions.
const FUNCTION_PREFIX = 'Fab 5 '

const FUNCTION_BUILDPACK = 'raw'

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled rejection at: Promise', p, 'reason:', reason)
  throw new Error('TODO unhandled promise rejection')
})

// listFunctions returns a promise that resolves to array of Fab 5 functions.
function listFunctions (workspaceId) {
  return new Promise((resolve, reject) => {
    const { ListFunctionsRequest } = require('@segment/connections-api/functions/v1beta/functions_pb')

    const req = new ListFunctionsRequest()
    req.setWorkspaceId(workspaceId)
    req.setType('DESTINATION')

    functions.list(req, METADATA, (err, resp) => {
      if (err) return reject(err)
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
  const destinations = require('../../destinations')()
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

function destMetaDescription (destination) {
  const { path, compiled, ...cleanDestination } = destination
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

  const { partnerActions, ...destinationMeta } = destination

  const metaSetting = new FunctionSetting()
  metaSetting.setType('string')
  metaSetting.setLabel('Destination Metadata')
  metaSetting.setName('metadata')
  metaSetting.setDescription(destMetaDescription(destinationMeta))
  settings.push(metaSetting)

  for (const action of partnerActions) {
    const actionSetting = new FunctionSetting()
    const { code, ...cleanAction } = action
    actionSetting.setType('string')
    actionSetting.setLabel(`Action Metadata: ${action.slug}`)
    actionSetting.setName(`action${action.slug}`)
    actionSetting.setDescription(JSON.stringify(cleanAction))
    settings.push(actionSetting)
  }

  return settings
}

function createFunction (workspaceId, name, destination) {
  console.log(`Creating function ${name} (${destination.compiled.length} bytes)`)

  const { Function: Fn, CreateFunctionRequest } = require('@segment/connections-api/functions/v1beta/functions_pb')

  const fn = new Fn()
  fn.setDisplayName(name)
  fn.setBuildpack(FUNCTION_BUILDPACK)
  fn.setCode(destination.compiled)
  fn.setSettingsList(functionSettings(destination))

  const req = new CreateFunctionRequest()
  req.setWorkspaceId(workspaceId)
  req.setType('DESTINATION')
  req.setFunction(fn)

  return new Promise((resolve, reject) => {
    functions.create(req, METADATA, (err, resp) => {
      if (err) return reject(new Error(`${name}: ${err.message}`))
      resolve(resp.toObject())
    })
  })
}

function updateFunction (workspaceId, id, destination) {
  console.log(`Updating function ${id} (${destination.compiled.length} bytes)`)

  const { Function: Fn, UpdateFunctionRequest } = require('@segment/connections-api/functions/v1beta/functions_pb')
  const { FieldMask } = require('google-protobuf/google/protobuf/field_mask_pb.js')

  const fn = new Fn()
  fn.setId(id)
  fn.setWorkspaceId(workspaceId)
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

exports.command = 'deploy [workspace]'

exports.describe = 'Deploy Fab 5 functions to a workspace in staging.'

exports.builder = {
  workspace: {
    describe: 'Workspace ID to deploy to.',
    default: 'lmD77Nebzz'
  }
}

exports.handler = async function (argv) {
  const { workspace } = argv

  Promise.all([
    listFunctions(workspace),
    compileDestinations()
  ]).then(([functions, destinations]) => {
    const fnName = (slug) => `${FUNCTION_PREFIX}${slug}`
    const fnWithSlug = (slug) => functions.find((f) => f.displayName.startsWith(fnName(slug)))

    const createDestinations = destinations.filter((d) => !fnWithSlug(d.slug))
    const updateDestinations = destinations.filter((d) => !createDestinations.includes(d))

    return Promise.allSettled([
      ...createDestinations.map((d) => createFunction(workspace, fnName(d.slug), d)),
      ...updateDestinations.map((d) => updateFunction(workspace, fnWithSlug(d.slug).id, d))
    ])
  }).then((results) => {
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        console.log(`Deployed: ${result.value.displayName} (${result.value.id})`)
      } else {
        console.log(`FAILED: ${result.reason}`)
      }
    })
  }).catch((err) => {
    console.log('FAILED', err)
  })
}

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
  const { readdirSync, statSync } = require('fs')
  const { join, resolve } = require('path')
  const { compile } = require('./compile')

  const root = './destinations'

  return Promise.all(
    readdirSync(root)
      .filter(sub => statSync(join(root, sub)).isDirectory())
      .map((destination) => {
        const path = resolve(join(root, destination))
        return compile(path).then((code) => {
          return {
            slug: destination,
            code: code
          }
        })
      })
  )
}

function functionSettings () {
  const { FunctionSetting } = require('@segment/connections-api/functions/v1beta/functions_pb')

  // yo dawg i heard...
  const settingSetting = new FunctionSetting()
  settingSetting.setType('string')
  settingSetting.setLabel('Settings JSON')
  settingSetting.setName('s')
  settingSetting.setRequired(true)
  settingSetting.setDescription('{"json": "goes here"}')

  return [settingSetting]
}

function createFunction (name, code) {
  const { Function: Fn, CreateFunctionRequest } = require('@segment/connections-api/functions/v1beta/functions_pb')

  const fn = new Fn()
  fn.setDisplayName(name)
  fn.setBuildpack(FUNCTION_BUILDPACK)
  fn.setCode(code)
  fn.setSettingsList(functionSettings())

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

function updateFunction (id, code) {
  const { Function: Fn, UpdateFunctionRequest } = require('@segment/connections-api/functions/v1beta/functions_pb')
  const { FieldMask } = require('google-protobuf/google/protobuf/field_mask_pb.js')

  const fn = new Fn()
  fn.setId(id)
  fn.setWorkspaceId(WORKSPACE_ID)
  fn.setBuildpack(FUNCTION_BUILDPACK)
  fn.setCode(code)
  fn.setSettingsList(functionSettings())

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

console.log('Deploying...')

Promise.all([
  listFunctions(),
  compileDestinations()
]).then(([functions, destinations]) => {
  const fnName = (slug) => `${FUNCTION_PREFIX}${slug}`
  const fnWithSlug = (slug) => functions.find((f) => f.displayName.startsWith(fnName(slug)))

  const createDestinations = destinations.filter((d) => !fnWithSlug(d.slug))
  const updateDestinations = destinations.filter((d) => !createDestinations.includes(d))

  return Promise.all([
    ...createDestinations.map((d) => createFunction(fnName(d.slug), d.code)),
    ...updateDestinations.map((d) => updateFunction(fnWithSlug(d.slug).id, d.code))
  ])
}).then((functions) => {
  functions.forEach((fn) => {
    console.log(`Deployed: ${fn.displayName} (${fn.id})`)
  })
}).catch((reason) =>
  console.log('ERROR', reason)
)

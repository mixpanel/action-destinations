const { grpc } = require('grpc-web-client')
const { NodeHttpTransport } = require('grpc-web-node-http-transport')
grpc.setDefaultTransport(NodeHttpTransport())

const { FunctionsClient } = require('@segment/connections-api/functions/v1beta/functions_pb_service')
const {
  Function,
  ListFunctionsRequest,
  CreateFunctionRequest
} = require('@segment/connections-api/functions/v1beta/functions_pb')

const functions = new FunctionsClient('http://connections-service.segment.local')

const WORKSPACE_ID = 'lmD77Nebzz'
const METADATA = {
  'x-subject-id': 'users/i2VTJURQprNfqdwjLFPWYx',
  'x-subject-scope': 'workspace'
}

const req = new ListFunctionsRequest()
req.setWorkspaceId(WORKSPACE_ID)
req.setType('DESTINATION')

function listFunctions () {
  return new Promise((resolve, reject) => {
    console.log('FUNCTIONS:')
    functions.list(req, METADATA, (err, resp) => {
      if (err) reject(err)
      resp.toObject().functionsList.forEach((fn) => console.log('- ' + fn.displayName))
      resolve(null)
    })
  })
}

listFunctions().then(() => {
  console.log()

  const { readdirSync, statSync } = require('fs')
  const { join } = require('path')

  const dirs = path => {
    return readdirSync(path).filter(f => statSync(join(path, f)).isDirectory())
  }

  console.log(dirs('./destinations'))
})

// const fn = new Function()
// fn.setDisplayName('API test')
// fn.setBuildpack('boreal')
// fn.setCode('async function onTrack(event, settings) {}')

// const createReq = new CreateFunctionRequest()
// createReq.setWorkspaceId('lmD77Nebzz')
// createReq.setType('DESTINATION')
// createReq.setFunction(fn)

// functions.create(createReq, metadata, (err, resp) => {
//   if (err) throw err
//   console.log(err)
//   console.log(resp.toObject())
// })

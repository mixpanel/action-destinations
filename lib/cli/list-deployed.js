const { grpc } = require('grpc-web-client')
const { NodeHttpTransport } = require('grpc-web-node-http-transport')
grpc.setDefaultTransport(NodeHttpTransport())

const { FunctionsClient } = require('@segment/connections-api/functions/v1beta/functions_pb_service')
const functions = new FunctionsClient('http://connections-service.segment.local')

const METADATA = {
  'x-subject-id': 'users/__system__',
  'x-subject-scope': 'workspace'
}

// Cheap hack to identify and find our functions.
const FUNCTION_PREFIX = 'Fab 5 '

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
    req.setPageSize(100)

    functions.list(req, METADATA, (err, resp) => {
      if (err) return reject(err)
      resolve(
        resp.toObject().functionsList
          .filter((f) => f.displayName.startsWith(FUNCTION_PREFIX))
      )
    })
  })
}

exports.command = 'list-deployed [workspace]'

exports.describe = 'List deployed Fab 5 destinations.'

exports.builder = {
  workspace: {
    describe: 'Workspace ID to list Fab 5 destinations of.',
    default: 'lmD77Nebzz'
  }
}

exports.handler = async function (argv) {
  const { workspace } = argv

  const functions = await listFunctions(workspace)

  functions.forEach((fn) => {
    console.log(`${fn.id}\t${fn.displayName}`)
  })
}

const { grpc } = require('grpc-web-client')
const { NodeHttpTransport } = require('grpc-web-node-http-transport')
grpc.setDefaultTransport(NodeHttpTransport())

const { FunctionsClient } = require('@segment/connections-api/functions/v1beta/functions_pb_service')
const functions = new FunctionsClient('http://connections-service.segment.local')

const { AppsClient } = require('@segment/connections-api/apps/v1beta/apps_pb_service')
const apps = new AppsClient('http://connections-service.segment.local')

const listFunctions = require('./lib/list-functions')

const prompts = require('prompts')

const METADATA = {
  'x-subject-id': 'users/__system__',
  'x-subject-scope': 'workspace'
}

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled rejection at: Promise', p, 'reason:', reason)
  throw new Error('TODO unhandled promise rejection')
})

async function deleteFunction (fn) {
  console.log(`Deleting function "${fn.displayName}"`)

  const { DeleteFunctionRequest } = require('@segment/connections-api/functions/v1beta/functions_pb')

  const req = new DeleteFunctionRequest()
  req.setWorkspaceId(fn.workspaceId)
  req.setFunctionId(fn.id)

  return new Promise((resolve, reject) => {
    functions.delete(req, METADATA, (err, resp) => {
      if (err) return reject(new Error(`${fn.displayName}: ${err.message}`))
      resolve(fn)
    })
  })
}

async function cleanupOrphans (workspace) {
  console.log('Cleaning up orphan app records from workspace...')

  const { AppDeleteOrphansRequest } = require('@segment/connections-api/apps/v1beta/apps_pb')

  const req = new AppDeleteOrphansRequest()
  req.setWorkspaceId(workspace)

  return new Promise((resolve, reject) => {
    apps.deleteOrphans(req, METADATA, (err, resp) => {
      if (err) return reject(err)
      resolve(resp.toObject())
    })
  })
}

exports.command = 'undeploy [workspace]'

exports.describe = 'Delete Fab 5 functions from a workspace.'

exports.builder = {
  workspace: {
    describe: 'Workspace ID to deploy to.',
    default: 'lmD77Nebzz'
  }
}

exports.handler = async function (argv) {
  const { workspace } = argv

  const deployed = await listFunctions(workspace)

  const input = await prompts({
    type: 'multiselect',
    name: 'values',
    message: 'Select destinations to delete',
    choices: deployed.map((fn) => ({ title: fn.displayName, value: fn }))
  })

  Promise.allSettled(
    input.values.map((fn) => deleteFunction(fn))
  ).then((results) => {
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        console.log(`Undeployed: ${result.value.id}\t${result.value.displayName}`)
      } else {
        console.log(`FAILED: ${result.reason}`)
      }
    })
  }).then(async () => {
    const out = await cleanupOrphans(workspace)
    out.resultsList.forEach((line) => console.log(line))
  }).catch((err) => {
    console.log('FAILED', err)
  })
}

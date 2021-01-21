#!/usr/bin/env node

import fs from 'fs'
import childProcess from 'child_process'
import util from 'util'
import path from 'path'

const exec = util.promisify(childProcess.exec)

async function checkReferences() {
  if (process.env.NO_CHAMBER) {
    // dont run it on CI
    return
  }

  const { stdout } = await exec('yarn workspaces info --json')

  const lines = stdout.split('\n')
  const depthTree = lines.slice(1, lines.length - 2).join('\n')
  const workspaces = JSON.parse(depthTree)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateConfig(workspace: any, location: string, fileName: string) {
    const tsconfigPath = path.resolve(location, fileName)

    if (fs.existsSync(tsconfigPath)) {
      const workspaceConfig = JSON.parse(fs.readFileSync(tsconfigPath).toString())

      if (workspace.workspaceDependencies.length) {
        workspaceConfig.references = []
      }

      if (!workspaceConfig.compilerOptions) {
        workspaceConfig.compilerOptions = {}
      }

      if (!workspaceConfig.compilerOptions.composite) {
        workspaceConfig.compilerOptions.composite = true
      }

      for (const dependency of workspace.workspaceDependencies) {
        const dependencyLocation = path.resolve(process.cwd(), workspaces[dependency].location)
        const filePath = path.resolve(dependencyLocation, fileName)
        if (fs.existsSync(filePath)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          workspaceConfig.references.push({
            path: path.relative(location, filePath)
          })
        }
      }
      fs.writeFileSync(tsconfigPath, JSON.stringify(workspaceConfig, null, 2))
    }
  }

  for (const name in workspaces) {
    const workspace = workspaces[name]
    const location = path.resolve(process.cwd(), workspace.location)
    const fileNames = ['tsconfig.build.json']

    for (const fileName of fileNames) {
      updateConfig(workspace, location, fileName)
    }
  }
}

checkReferences().catch((err) => console.error(err))

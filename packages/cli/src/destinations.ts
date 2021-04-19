import { DestinationDefinition } from '@segment/actions-core'
import path from 'path'

/** Attempts to load a destination definition from a given file path */
export async function loadDestination(filePath: string): Promise<null | DestinationDefinition> {
  const importPath = path.join(process.cwd(), filePath)

  // Import the file, assert that it's a destination definition entrypoint
  // look for `default` or `destination` export
  const destination = await import(importPath).then(mod => mod.destination || mod.default)

  // Loose validation on a destination definition
  if (!destination?.name || typeof destination?.actions !== 'object') {
    return null
  }

  return destination as DestinationDefinition
}

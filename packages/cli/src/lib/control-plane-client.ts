import { destinations as browserDestinations } from '@segment/browser-destinations'
import { ASSET_PATH } from '../config'
import {
  controlPlaneService,
  DestinationMetadata,
  DestinationMetadataAction,
  DestinationMetadataActionCreateInput,
  DestinationMetadataActionsUpdateInput,
  DestinationMetadataUpdateInput,
  DestinationSubscriptionPresetInput,
  RemotePlugin,
  RemotePluginCreateInput
} from '../lib/control-plane-service'

const NOOP_CONTEXT = {}

export async function getDestinationMetadatas(destinationIds: string[]): Promise<DestinationMetadata[]> {
  const { data, error } = await controlPlaneService.getAllDestinationMetadatas(NOOP_CONTEXT, {
    byIds: destinationIds
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Could not load metadatas')
  }

  return data.metadatas
}

export async function getDestinationMetadataActions(destinationIds: string[]): Promise<DestinationMetadataAction[]> {
  const { data, error } = await controlPlaneService.getDestinationMetadataActions(NOOP_CONTEXT, {
    metadataIds: destinationIds
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Could not load actions')
  }

  return data.actions
}

export async function updateDestinationMetadata(
  destinationId: string,
  input: DestinationMetadataUpdateInput
): Promise<DestinationMetadata> {
  const { data, error } = await controlPlaneService.updateDestinationMetadata(NOOP_CONTEXT, {
    destinationId,
    input
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Could not update metadata')
  }

  return data.metadata
}

export async function setSubscriptionPresets(metadataId: string, presets: DestinationSubscriptionPresetInput[]) {
  const { data, error } = await controlPlaneService.setDestinationSubscriptionPresets(NOOP_CONTEXT, {
    metadataId,
    presets
  })

  if (error) {
    console.log(error)
    throw error
  }

  if (!data) {
    throw new Error('Could not set subscription presets')
  }

  return data.presets
}

export async function createDestinationMetadataActions(
  input: DestinationMetadataActionCreateInput[]
): Promise<DestinationMetadataAction[]> {
  if (!input.length) return []

  const { data, error } = await controlPlaneService.createDestinationMetadataActions(NOOP_CONTEXT, {
    input
  })

  if (error) {
    console.log(error)
    throw error
  }

  if (!data) {
    throw new Error('Could not create metadata actions')
  }

  return data.actions
}

export async function updateDestinationMetadataActions(
  input: DestinationMetadataActionsUpdateInput[]
): Promise<DestinationMetadataAction[]> {
  if (!input.length) return []

  const { data, error } = await controlPlaneService.updateDestinationMetadataActions(NOOP_CONTEXT, {
    input
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Could not update metadata actions')
  }

  return data.actions
}

export async function getRemotePluginByDestinationIds(metadataIds: string[]): Promise<RemotePlugin[]> {
  const { data, error } = await controlPlaneService.getRemotePluginsByDestinationMetadataIds(NOOP_CONTEXT, {
    metadataIds
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('could not load remote plugins')
  }

  return data.remotePlugins
}

// TODO(@juliofarah) this UPSERT strategy must be moved to control plane service;
export async function persistRemotePlugin(
  metadata: DestinationMetadata,
  remotePlugins: RemotePlugin[]
): Promise<RemotePlugin[]> {
  const metadataBundle = browserDestinations[metadata.id].path
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const [bundleName, _index] = metadataBundle.split('/').slice(-2)

  const responses = []

  if (remotePlugins.length) {
    for (const remotePlugin of remotePlugins) {
      const url = remotePlugin.url ?? `${ASSET_PATH}/${bundleName}.js` ?? `${ASSET_PATH}/${metadata.slug}.js`

      if (!url) {
        throw new Error('Error building plugin URL')
      }

      const response = await controlPlaneService.updateRemotePlugin(NOOP_CONTEXT, {
        metadataId: metadata.id,
        name: remotePlugin.name,
        input: {
          url
        }
      })

      if (!response || !response.data) {
        throw new Error(`Could not save remote plugin ${remotePlugin?.name ?? ''}`)
      }

      if (response.error) {
        throw response.error
      }

      responses.push(response.data.remotePlugin)
    }
  } else {
    const url = `${ASSET_PATH}/${bundleName}.js` ?? `${ASSET_PATH}/${metadata.slug}.js`

    if (!url) {
      throw new Error('Error building plugin URL')
    }

    const remotePluginInput: RemotePluginCreateInput = {
      metadataId: metadata.id,
      name: `${metadata.name}`,
      libraryName: `${bundleName}Destination`,
      url
    }

    const response = await controlPlaneService.createRemotePlugin(NOOP_CONTEXT, {
      input: remotePluginInput
    })

    if (!response || !response.data) {
      throw new Error(`Could not save remote plugin ${bundleName}Destination`)
    }

    if (response.error) {
      throw response.error
    }

    responses.push(response.data.remotePlugin)
  }

  return responses
}

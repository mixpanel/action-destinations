import * as FullStory from '@fullstory/browser'
import { loadScript } from '../../runtime/load-script'
import type { BrowserDestinationDefinition } from '../../lib/browser-destinations'
import { resolveWhen } from '../../runtime/resolve-when'
import { browserDestination } from '../../runtime/shim'
import event from './event'
import type { Settings } from './generated-types'
import { initScript } from './init-script'
import setUserVars from './setUserVars'

export const destination: BrowserDestinationDefinition<Settings, typeof FullStory> = {
  name: 'Fullstory',
  authentication: {
    fields: {
      orgId: {
        description: 'The organization ID for FullStory',
        label: 'orgId',
        type: 'string',
        required: true
      }
    }
  },
  actions: {
    event,
    setUserVars
  },
  initialize: async ({ settings }) => {
    initScript({ debug: false, org: settings.orgId })
    await loadScript('https://edge.fullstory.com/s/fs.js')
    await resolveWhen(() => Object.prototype.hasOwnProperty.call(window, 'FS'), 100)
    return FullStory
  }
}

export default browserDestination(destination)

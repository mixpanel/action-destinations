import show from './show'
import type { Settings } from './generated-types'
import { BrowserDestinationDefinition } from '../../lib/browser-destinations'
import { bootstrap } from './bootstrap'

const destination: BrowserDestinationDefinition<Settings, Intercom_.IntercomStatic> = {
  name: 'Intercom',
  actions: {
    show
  },
  bootstrap
}

export default destination

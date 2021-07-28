import type { Settings } from './generated-types'
import type { BrowserDestinationDefinition } from '../../lib/browser-destinations'
import { browserDestination } from '../../runtime/shim'
import { initScript } from './init-script'
import type appboy from '@braze/web-sdk'

declare global {
  interface Window {
    appboy: typeof appboy
  }
}

interface BrazeInitializeSettings {
  apiKey: string
  safariWebsitePushId: string
  allowCrawlerActivity: boolean
  doNotLoadFontAwesome: boolean
  enableLogging: boolean
  automaticallyDisplayMessages: boolean
  localization: string
  minimumIntervalBetweenTriggerActionsInSeconds: number
  openInAppMessagesInNewTab: boolean
  openNewsFeedCardsInNewTab: boolean
  sessionTimeoutInSeconds: number
  requireExplicitInAppMessageDismissal: boolean
  enableHtmlInAppMessages: boolean
  trackAllPages: boolean
  trackNamedPages: boolean
  customEndpoint: string
  version: number
  logPurchaseWhenRevenuePresent: boolean
  onlyTrackKnownUsersOnWeb: boolean
  baseUrl: string
}

// Switch from unknown to the partner SDK client types
export const destination: BrowserDestinationDefinition<Settings, typeof appboy> = {
  name: 'Braze Web Mode',
  slug: 'actions-braze-web',

  authentication: {
    fields: {
      api_key: {
        description: 'Created under Developer Console in the Braze Dashboard.',
        label: 'API Key',
        type: 'string',
        required: true
      },
      endpoint: {
        description: 'Your Braze SDK endpoint. [See more details](https://www.braze.com/docs/api/basics/#endpoints).',
        label: 'SDK Endpoint',
        type: 'string',
        format: 'uri',
        required: true
      }
    }
  },

  initialize: async ({ settings }, dependencies) => {
    // default options set at the legacy appboy destination
    // not sure if this is needed yet
    const config: BrazeInitializeSettings = {
      apiKey: settings.api_key,
      safariWebsitePushId: '',
      allowCrawlerActivity: false,
      doNotLoadFontAwesome: false,
      enableLogging: false,
      automaticallyDisplayMessages: true,
      localization: 'en',
      minimumIntervalBetweenTriggerActionsInSeconds: 30,
      openInAppMessagesInNewTab: false,
      openNewsFeedCardsInNewTab: false,
      sessionTimeoutInSeconds: 30,
      requireExplicitInAppMessageDismissal: false,
      enableHtmlInAppMessages: false,
      trackAllPages: false,
      trackNamedPages: false,
      customEndpoint: '',
      // changed from 1 to 3
      version: 3,
      logPurchaseWhenRevenuePresent: false,
      onlyTrackKnownUsersOnWeb: false,
      baseUrl: settings.endpoint
    }

    initScript({
      apiKey: settings.api_key,
      config
    })

    if (dependencies) {
      await dependencies.loadScript('https://js.appboycdn.com/web-sdk/3.3/service-worker.js')
      await dependencies.resolveWhen(() => Object.prototype.hasOwnProperty.call(window, 'appboy'), 100)
    }
    return window.appboy
  },

  actions: {
    // logUser
  }
}

export default browserDestination(destination)

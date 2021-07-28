import type { Analytics, Context, Plugin } from '@segment/analytics-next'
import type {
  DestinationDefinition,
  ExecuteInput,
  ActionDefinition,
  CustomAuthentication,
  JSONLikeObject
} from '@segment/actions-core'

export type ActionInput<Settings, Payload> = ExecuteInput<Settings, Payload> & {
  analytics: Analytics
  context: Context
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BrowserActionDefinition<Settings, Client, Payload = any>
  extends Omit<ActionDefinition<Settings, Payload>, 'perform'> {
  perform: (client: Client, data: ActionInput<Settings, Payload>) => Promise<unknown> | unknown

  platform: 'web'

  /** Which step in the Analytics.js lifecycle this action should run */
  lifecycleHook?: Plugin['type']
}

export interface BrowserDestinationDependencies {
  loadScript: (src: string, attributes?: Record<string, string>) => Promise<HTMLScriptElement>
  resolveWhen: (condition: () => boolean, timeout?: number) => Promise<void>
}

export type InitializeOptions<Settings> = { settings: Settings; analytics: Analytics }
export interface BrowserDestinationDefinition<Settings, Client>
  extends Omit<DestinationDefinition<Settings>, 'actions' | 'authentication'> {
  initialize: (options: InitializeOptions<Settings>, dependencies?: BrowserDestinationDependencies) => Promise<Client>

  authentication?: Omit<CustomAuthentication<Settings>, 'testAuthentication' | 'scheme'>

  actions: {
    [key: string]: BrowserActionDefinition<Settings, Client>
  }
}

export interface Subscription {
  partnerAction: string
  name: string
  enabled: boolean
  subscribe: string
  mapping: JSONLikeObject
}

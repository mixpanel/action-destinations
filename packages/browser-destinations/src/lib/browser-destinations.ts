import { Analytics, Context, Plugin } from '@segment/analytics-next'
import {
  DestinationDefinition,
  ActionDefinition,
  CustomAuthentication,
  JSONLikeObject
} from '@segment/destination-actions'
import { ExecuteInput } from '@segment/destination-actions/src/lib/destination-kit/step'

export type ActionInput<Settings, Payload> = ExecuteInput<Settings, Payload> & {
  analytics: Analytics
  context: Context
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BrowserActionDefinition<Settings, Client, Payload = any>
  extends Omit<ActionDefinition<Settings, Payload>, 'perform'> {
  perform: (client: Client, data: ActionInput<Settings, Payload>) => Promise<unknown> | unknown

  /** Which step in the Analytics.js lifecycle this action should run */
  lifecycleHook?: Plugin['type']
}

export type InitializeOptions<Settings> = { settings: Settings; analytics: Analytics }
export interface BrowserDestinationDefinition<Settings, Client>
  extends Omit<DestinationDefinition<Settings>, 'actions' | 'authentication'> {
  initialize: (options: InitializeOptions<Settings>) => Promise<Client>

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

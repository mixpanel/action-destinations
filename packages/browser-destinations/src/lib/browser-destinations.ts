import {
  DestinationDefinition,
  ActionDefinition,
  CustomAuthentication,
  JSONLikeObject
} from '@segment/destination-actions'
import { ExecuteInput } from '@segment/destination-actions/dist/lib/destination-kit/step'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BrowserActionDefinition<Settings, Client, Payload = any>
  extends Omit<ActionDefinition<Settings, Payload>, 'perform'> {
  perform: (client: Client, data: ExecuteInput<Settings, Payload>) => Promise<unknown> | unknown
}

export interface BrowserDestinationDefinition<Settings, Client>
  extends Omit<DestinationDefinition<Settings>, 'actions' | 'authentication'> {
  initialize: (settings: Settings) => Promise<Client>

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

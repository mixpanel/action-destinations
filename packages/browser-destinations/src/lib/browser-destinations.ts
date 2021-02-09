import { DestinationDefinition, ActionDefinition } from '@segment/destination-actions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BrowserActionDefinition<Settings, Client, Payload = any>
  extends Omit<ActionDefinition<Settings, Payload>, 'perform'> {
  perform: (client: Client, data: Payload, settings: Settings) => Promise<unknown> | unknown
}

export interface BrowserDestinationDefinition<Settings, Client>
  extends Omit<DestinationDefinition<Settings>, 'actions'> {
  bootstrap: (settings: Settings) => Promise<Client>

  actions: {
    [key: string]: BrowserActionDefinition<Settings, Client>
  }
}

export interface Subscription {
  partnerAction: string
  name: string
  enabled: boolean
  subscribe: string
  mapping: Record<string, object>
}

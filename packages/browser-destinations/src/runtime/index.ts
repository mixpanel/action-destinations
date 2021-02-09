import { validate, parseFql } from '@segment/fab5-subscriptions'
import { Plugin, Context } from '@segment/analytics-next'
import { BrowserDestinationDefinition, Subscription } from '../lib/browser-destinations'

export function browserDestinationPlugin<S, C>(
  def: BrowserDestinationDefinition<S, C>,
  settings: S,
  subscriptions: Subscription[]
): Plugin {
  let client: C

  async function evaluate(ctx: Context): Promise<Context> {
    const validSubs = subscriptions.filter((subscription) => {
      const isSubscribed = validate(parseFql(subscription.subscribe), ctx.event)
      return isSubscribed
    })

    const invocations = validSubs.map(async (sub) => {
      const actionSlug = sub.partnerAction
      const input = {
        event: ctx.event,
        mapping: sub.mapping ?? {},
        settings
      }

      const action = def.actions[actionSlug]
      if (!action) {
        return
      }

      return action.perform(client, input, settings)
    })

    await Promise.all(invocations)
    // TODO: some sort of error handling
    return ctx
  }

  return {
    name: def.name,
    type: 'destination',
    version: '0.1.0',
    ready: Promise.resolve,

    isLoaded: () => client !== undefined,
    load: async () => {
      client = await def.bootstrap(settings)
    },

    track: evaluate,
    page: evaluate,
    alias: evaluate,
    identify: evaluate,
    group: evaluate
  }
}

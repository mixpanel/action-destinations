import { Context, Plugin } from '@segment/analytics-next'
import { JSONObject } from '@segment/destination-actions'
import { ExecuteInput } from '@segment/destination-actions/dist/lib/destination-kit/step'
import { transform } from '@segment/destination-actions/dist/lib/mapping-kit'
import { parseFql, validate } from '@segment/fab5-subscriptions'
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

      const input: ExecuteInput<S, unknown> = {
        payload: ctx.event,
        mapping: (sub.mapping ?? {}) as JSONObject,
        cachedFields: {},
        settings
      }

      const action = def.actions[actionSlug]
      if (!action) {
        return
      }

      if (sub.mapping) {
        input.payload = transform(sub.mapping, input.payload as JSONObject)
      }

      return action.perform(client, input)
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
      client = await def.initialize(settings)
    },

    track: evaluate,
    page: evaluate,
    alias: evaluate,
    identify: evaluate,
    group: evaluate
  }
}

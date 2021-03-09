import { Analytics, Context, Plugin } from '@segment/analytics-next'
import { JSONObject } from '@segment/destination-actions'
import { transform } from '@segment/destination-actions/src/lib/mapping-kit'
import { parseFql, validate } from '@segment/fab5-subscriptions'
import { ActionInput, BrowserDestinationDefinition, Subscription } from '../lib/browser-destinations'

export function browserDestinationPlugin<S, C>(
  def: BrowserDestinationDefinition<S, C>,
  settings: S,
  subscriptions: Subscription[]
): Record<keyof BrowserDestinationDefinition<S, C>['actions'], Plugin> {
  let client: C
  let analytics: Analytics

  const load: Plugin['load'] = async (_ctx, analyticsInstance) => {
    if (client !== undefined) {
      return
    }

    client = await def.initialize({ settings, analytics: analyticsInstance })
    analytics = analyticsInstance
  }

  return Object.entries(def.actions).reduce((acc, [key, action]) => {
    async function evaluate(ctx: Context): Promise<Context> {
      const validSubs = subscriptions.filter((subscription) => {
        const isSubscribed = validate(parseFql(subscription.subscribe), ctx.event)
        return isSubscribed
      })

      const invocations = validSubs.map(async (sub) => {
        const actionSlug = sub.partnerAction
        if (actionSlug !== key) {
          return
        }

        const input: ActionInput<S, unknown> = {
          payload: ctx.event,
          mapping: (sub.mapping ?? {}) as JSONObject,
          cachedFields: {},
          settings,
          analytics,
          context: ctx
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

    const plugin = {
      name: `${def.name} ${key}`,
      type: action.lifecycleHook ?? 'destination',
      version: '0.1.0',
      ready: Promise.resolve,

      isLoaded: () => client !== undefined,
      load,

      track: evaluate,
      page: evaluate,
      alias: evaluate,
      identify: evaluate,
      group: evaluate
    }

    return {
      ...acc,
      [key]: plugin
    }
  }, {} as Record<keyof BrowserDestinationDefinition<S, C>['actions'], Plugin>)
}

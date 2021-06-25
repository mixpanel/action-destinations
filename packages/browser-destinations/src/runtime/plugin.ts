import type { Analytics, Context, Plugin } from '@segment/analytics-next'
import type { JSONObject } from '@segment/actions-core'
import { transform } from '@segment/actions-core/mapping-kit'
import { parseFql, validate } from '@segment/fab5-subscriptions'
import { ActionInput, BrowserDestinationDefinition, Subscription } from '../lib/browser-destinations'

export function generatePlugins<S, C>(
  def: BrowserDestinationDefinition<S, C>,
  settings: S,
  subscriptions: string | Subscription[]
): Plugin[] {
  let client: C
  let analytics: Analytics

  const load: Plugin['load'] = async (_ctx, analyticsInstance) => {
    if (client !== undefined) {
      return
    }

    client = await def.initialize({ settings, analytics: analyticsInstance })
    analytics = analyticsInstance
  }

  // Only load the actions that have active subscriptions
  const parsedSubs: Subscription[] = typeof subscriptions === 'string' ? JSON.parse(subscriptions) : subscriptions
  const actionsToLoad = parsedSubs.filter((s) => s.enabled).map((s) => s.partnerAction)

  return Object.entries(def.actions).reduce((acc, [key, action]) => {
    if (!actionsToLoad.includes(key)) return acc

    async function evaluate(ctx: Context): Promise<Context> {
      const validSubs = parsedSubs.filter((subscription) => {
        const isSubscribed = validate(parseFql(subscription.subscribe), ctx.event)
        return isSubscribed
      })

      // the transform function mutates the `mapping` object in the original subscription for some reason
      // we do not want that to happen on the web though
      const clonedSubs = JSON.parse(JSON.stringify(validSubs)) as Subscription[]

      const invocations = clonedSubs.map(async (sub) => {
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

    acc.push(plugin)
    return acc
  }, [] as Plugin[])
}

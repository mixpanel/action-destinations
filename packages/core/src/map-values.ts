/**
 * Lightweight alternative to lodash.mapValues
 * Creates an object with the same keys as the input object
 */
export function mapValues<
  Values extends Record<string, unknown>,
  Obj extends Record<string, Values>,
  ValueKey extends keyof Values
>(obj: Obj, key: ValueKey): { [K in keyof Obj]: Obj[K][ValueKey] } {
  return Object.entries(obj).reduce((agg, [name, value]) => {
    // @ts-ignore this is a pretty complex type, skipping for now
    agg[name] = value[key]
    return agg
  }, {} as { [K in keyof Obj]: Obj[K][ValueKey] })
}

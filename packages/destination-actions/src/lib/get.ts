/**
 * Lightweight alternative to lodash.get with similar coverage
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function get<T = unknown>(obj: any, path: string | string[], defValue?: unknown): T | undefined {
  // If path is not defined or it has false value
  if (!path) return undefined

  // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
  // Regex explained: https://regexr.com/58j0k
  const pathArray = Array.isArray(path) ? path : (path.match(/([^[.\]])+/g) as string[])

  // Find value if exist return otherwise return undefined value
  const value = pathArray.reduce((prevObj, key) => prevObj && prevObj[key], obj)
  return value || defValue
}

import http, { RequestOptions } from 'http'
import https from 'https'
import net from 'net'
import { checkRestrictedIp, lookup } from './dns'

type BeforeRequestFn = (options: RequestOptions) => void

/**
 * Similar to Node's internal method to convert a URL to options http.request expects
 */
function urlToOptions(url: URL): RequestOptions {
  const options: RequestOptions = {
    protocol: url.protocol,
    hostname:
      typeof url.hostname === 'string' && url.hostname.startsWith('[') ? url.hostname.slice(1, -1) : url.hostname,
    path: `${url.pathname || ''}${url.search || ''}`
  }

  if (url.port !== '') {
    options.port = Number(url.port)
  }

  if (url.username || url.password) {
    options.auth = `${url.username}:${url.password}`
  }

  return options
}

/**
 * Extract a single request options object from
 * `http.request`, `http.get` and `new http.ClientRequest` args
 * We want our beforeRequest hook to have a single object
 */
function parsedOptions(...args: unknown[]) {
  let url: RequestOptions | undefined
  let options: RequestOptions = {}

  if (typeof args[0] === 'string') {
    url = urlToOptions(new URL(args.shift() as string))
  } else if (args[0] instanceof URL) {
    url = urlToOptions(args.shift() as URL)
  }

  if (args.length > 0 && typeof args[0] === 'object') {
    options = args.shift() as RequestOptions
  }

  return { ...url, ...options }
}

/**
 * Create a Proxy that runs a given `fn` before running the `original` one
 * The proxied original will remain callable as-is
 * @param original - the original function to wrap in a Proxy
 * @param fn - the function to run first
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function proxyFunction<T extends (...args: any[]) => any>(original: T, fn: (...args: Parameters<T>) => void) {
  return new Proxy(original, {
    apply(target, thisArg, args) {
      Reflect.apply(fn, thisArg, args)
      return Reflect.apply(target, thisArg, args)
    }
  })
}

/**
 * Patch the http underlying request/get methods
 * to restrict ips via beforeRequest hooks and dns lookup
 */
function patchHttpModules(options: { beforeRequest: BeforeRequestFn[]; lookup: net.LookupFunction }) {
  if (Array.isArray(options.beforeRequest) && options.beforeRequest.length > 0) {
    const runHooks = (...args: unknown[]) => {
      const requestOptions = parsedOptions(...args)
      for (const hook of options.beforeRequest) {
        hook(requestOptions)
      }
    }

    for (const module of [http, https]) {
      module.request = proxyFunction(module.request, runHooks)
      module.get = proxyFunction(module.get, runHooks)

      /** Also proxy the Agent class so we can specify a restricted dns.lookup */
      module.Agent = new Proxy(module.Agent, {
        construct(target, [options]) {
          return new target({ ...options, lookup: options.lookup })
        }
      })
    }
  }
}

patchHttpModules({
  beforeRequest: [checkRestrictedIp],
  lookup
})

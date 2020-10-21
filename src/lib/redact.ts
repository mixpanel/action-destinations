import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http'
import { escapeRegExp } from 'lodash'
import { JSONArray, JSONObject } from './json-object'

const safeRequestHeaders = [
  // Standard request fields
  'a-im',
  'accept',
  'accept-charset',
  'accept-datetime',
  'accept-encoding',
  'accept-language',
  'access-control-request-method',
  'access-control-request-headers',
  'cache-control',
  'connection',
  'content-length',
  'content-md5',
  'content-type',
  'date',
  'expect',
  'forwarded',
  'from',
  'host',
  'mandatory',
  'if-match',
  'if-modified-since',
  'if-none-match',
  'if-range',
  'if-unmodified-since',
  'max-forwards',
  'origin',
  'pragma',
  'range',
  'referer',
  'te',
  'upgrade',
  'user-agent',

  // Common non-standard request fields
  'dnt',
  'front-end-https',
  'proxy-connection',
  'save-data',
  'upgrade-insecure-requests',
  'x-att-deviceid',
  'x-do-not-track',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-http-method-override',
  'x-request-id',
  'x-correlation-id',
  'x-requested-with',
  'x-wap-profile'
]

const safeResponseHeaders = [
  // Standard response fields
  'accept-patch',
  'accept-ranges',
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-expose-headers',
  'access-control-max-age',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'age',
  'allow',
  'alt-svc',
  'cache-control',
  'connection',
  'content-disposition',
  'content-encoding',
  'content-language',
  'content-length',
  'content-location',
  'content-md5',
  'content-range',
  'content-type',
  'date',
  'delta-base',
  'etag',
  'expires',
  'im',
  'last-modified',
  'link',
  'location',
  'p3p',
  'pragma',
  'proxy-authenticate',
  'public-key-pins',
  'retry-after',
  'server',
  'strict-transport-security',
  'tk',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'vary',
  'via',
  'warning',
  'www-authenticate',
  'x-frame-options',

  // common non-standard response fields
  'content-security-policy',
  'refresh',
  'status',
  'timing-allow-origin',
  'x-content-duration',
  'x-content-security-policy',
  'x-content-type-options',
  'x-correlation-id',
  'x-powered-by',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
  'x-rate-limit-limit',
  'x-rate-limit-remaining',
  'x-rate-limit-reset',
  'x-request-id',
  'x-ua-compatible',
  'x-webkit-csp',
  'x-xss-protection'
]

export function redactUnsafeRequestHeaders(headers: OutgoingHttpHeaders): OutgoingHttpHeaders {
  const safeHeaders: OutgoingHttpHeaders = {}

  for (const key in headers) {
    if (isSafeRequestHeader(key)) {
      safeHeaders[key] = headers[key]
    } else {
      safeHeaders[key] = '<redacted>'
    }
  }

  return safeHeaders
}

export function redactUnsafeResponseHeaders(headers: IncomingHttpHeaders): IncomingHttpHeaders {
  const safeHeaders: IncomingHttpHeaders = {}

  for (const key in headers) {
    if (isSafeResponseHeader(key)) {
      safeHeaders[key] = headers[key]
    } else {
      safeHeaders[key] = '<redacted>'
    }
  }

  return safeHeaders
}

function isSafeRequestHeader(value: string): boolean {
  return safeRequestHeaders.includes(value.toLowerCase())
}

function isSafeResponseHeader(value: string): boolean {
  return safeResponseHeaders.includes(value.toLowerCase())
}

function redactString(str: string): string {
  if (str.length < 6) {
    return '***'
  }

  return str.slice(0, 4) + '*'.repeat(str.length - 4)
}

export function redactSettings(settings: JSONObject, privateSettings: JSONArray): JSONObject {
  let result = JSON.stringify(settings)

  for (const privateSetting of privateSettings) {
    if (typeof privateSetting === 'string') {
      const value = settings[privateSetting]
      if (typeof value === 'string' && value.length > 1) {
        const regex = new RegExp(escapeRegExp(value), 'g')
        result = result.replace(regex, redactString(value))
      }
    }
  }

  return JSON.parse(result)
}

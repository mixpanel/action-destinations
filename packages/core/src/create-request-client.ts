import addBasicAuthHeader from './middleware/add-basic-auth-header'
import createInstance, { AllRequestOptions, RequestOptions } from './request-client'

const baseClient = createInstance({
  timeout: 10000,
  headers: {
    'user-agent': 'Segment'
  },
  beforeRequest: [
    // Automatically handle username/password -> basic auth header
    addBasicAuthHeader
  ]
})

export type RequestClient = ReturnType<typeof createRequestClient>

/**
 * Creates a request client instance with Segment's default configuration + custom options
 */
export default function createRequestClient(...requestOptions: AllRequestOptions[]) {
  let client = baseClient

  // TODO include `data` bundle in before/after hooks
  // TODO expose before/after hooks to destination definition and action definition?
  for (const options of (requestOptions ?? [])) {
    client = client.extend(options)
  }

  // Limit request client interface and handle basic auth scheme
  return (url: string, options?: RequestOptions) => {
    return client(url, options)
  }
}

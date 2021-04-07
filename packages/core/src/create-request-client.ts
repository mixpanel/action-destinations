import got, { ExtendOptions, Got } from 'got'

/**
 * Creates a Got client instance with Segment's default configuration + custom options
 */
export default function createRequestClient(...options: ExtendOptions[]): Got {
  const defaultOptions = {
    // disable automatic retries
    retry: 0,
    // default is no timeout
    timeout: 5000,
    headers: {
      'user-agent': 'Segment'
    }
  }

  const client = got.extend(defaultOptions, ...options)
  return client
}

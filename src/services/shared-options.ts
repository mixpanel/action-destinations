import { OnCallData } from '@segment/remote-service-client'
import Context from '@/lib/context'

export const sharedOptions = {
  userAgent: 'Segment (fab-5)',
  onCall: ({ context, serviceName, method, endpoint: path, duration, retryCount, error }: OnCallData): void => {
    const ctx: Context = context

    // JSONRPC
    let endpoint = method
    // REST
    if (path) {
      endpoint = `${method} ${path}`
    }

    ctx.append('service_client_requests', {
      service: serviceName,
      endpoint,
      duration,
      retries: retryCount,
      error
    })
  }
}

interface Log {
  time: string
  key: string
  value: string
}

interface TraceRequest {
  protocol: string
  method: string
  url: string
  header?: Record<string, string>
  // base-64 encoded request payload
  body?: string
}

interface TraceResponse {
  protocol: string
  statusCode: number
  statusText: string
  header?: Record<string, string>
  body?: string
}

interface TraceError {
  type: string
  message: string
}

interface Exchange {
  time: string
  duration: string
  request: TraceRequest
  response?: TraceResponse
  error?: TraceError
}

export interface Span {
  name: string
  time: string
  duration: string
  logs?: Log[]
  spans?: Span[]
  exchange?: Exchange
}

function durationString(duration: number): string {
  return (duration / 1000.0).toFixed(3) + 's'
}

interface ConstructTraceArgs {
  name: string
  start: Date
  duration: number
}

/**
 * Constructs a trace of the request execution
 * @see {@link https://paper.dropbox.com/doc/Integrations-Interface-Specification-18u19AJu14EOpRBG3agRj#:h2=Traces}
 */
export function constructTrace(args: ConstructTraceArgs): Span {
  return {
    name: args.name,
    time: args.start.toISOString(),
    duration: durationString(args.duration)
  }
}

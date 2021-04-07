import { CustomError } from 'ts-custom-error'

export class UnsupportedActionError extends CustomError {
  ignored: boolean
  status: string
  retry: boolean

  constructor(action: string) {
    super(`"${action}" is not a supported cloud-mode action.`)
    this.ignored = true
    this.status = 'UNSUPPORTED_EVENT_TYPE'
    this.retry = false
  }
}

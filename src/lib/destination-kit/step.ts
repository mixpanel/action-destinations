import { EventEmitter } from 'events'
import { JSONObject } from '../json-object'

export interface StepResult {
  output?: JSONObject | string | null | undefined
  error?: JSONObject | null
}

export interface ExecuteInput {
  settings: JSONObject
  payload: JSONObject
  mapping?: JSONObject
}

/**
 * Step is the base class for all discrete execution steps. It handles executing the step, logging,
 * catching errors, and returning a result object.
 */
export class Step extends EventEmitter {
  executeStep?(ctx: ExecuteInput): Promise<string>

  async execute(ctx: ExecuteInput): Promise<StepResult> {
    const result: StepResult = {
      output: null,
      error: null
    }

    if (!this.executeStep) {
      return result
    }

    try {
      result.output = await this.executeStep(ctx)
    } catch (e) {
      result.error = e
    }

    return result
  }
}

/**
 * Steps is a list of one or more Step instances that can be executed in-order.
 */
export class Steps {
  steps: Step[]

  constructor() {
    this.steps = []
  }

  push(step: Step): void {
    this.steps.push(step)
  }

  async execute(ctx: ExecuteInput): Promise<StepResult[]> {
    if (this.steps.length === 0) {
      throw new Error('no steps defined')
    }

    const results: StepResult[] = []

    for (const step of this.steps) {
      const result = await step.execute(ctx)

      results.push(result)

      if (result.error) {
        break
      }
    }

    return results
  }
}

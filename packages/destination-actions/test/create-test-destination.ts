import { defaults, mapValues } from 'lodash'
import { Destination } from '@segment/actions-core'
import { createSegmentEvent } from './create-segment-event'
import type { Response } from 'got'
import type { DestinationDefinition, JSONObject, SegmentEvent } from '@segment/actions-core'

interface InputData<Settings> {
  /**
   * The Segment event. You can use `createSegmentEvent` if you want
   * to construct an event from partial data.
   */
  event?: Partial<SegmentEvent>
  /**
   * The raw input - this is what customers define. It may include
   * literal values as well as mapping-kit directives.
   */
  mapping?: JSONObject
  /**
   * The settings for a destination instance. Includes things like
   * `apiKey` or `subdomain`. Any fields that are used across all actions
   * in a destination.
   */
  settings?: Settings
  /**
   * Whether or not to use default mappings in the test.
   * Set to `false` or omit if you want to explicitly provide the raw input.
   * Set to `true` if you want to test the defaultMappings (along with any mapping passed in)
   */
  useDefaultMappings?: boolean
}

class TestDestination<T> extends Destination<T> {
  responses: Response[]

  constructor(destination: DestinationDefinition<T>) {
    super(destination)
  }

  /** Testing method that runs an action e2e while allowing slightly more flexible inputs */
  async testAction(
    action: string,
    { event, mapping, settings, useDefaultMappings }: InputData<T>
  ): Promise<Destination['responses']> {
    mapping = mapping ?? {}

    if (useDefaultMappings) {
      const fields = this.definition.actions[action].fields
      const defaultMappings = mapValues(fields, (prop) => prop.default)
      mapping = defaults(mapping, defaultMappings)
    }

    await super.executeAction(action, {
      event: createSegmentEvent(event),
      mapping,
      settings: settings ?? ({} as T)
    })

    const responses = this.responses
    this.responses = []

    return responses
  }
}

export function createTestDestination<T>(destination: DestinationDefinition<T>): TestDestination<T> {
  return new TestDestination(destination)
}

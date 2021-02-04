import { Response } from 'got'
import { defaults, mapValues } from 'lodash'
import { Destination, DestinationDefinition } from '../src/lib/destination-kit'
import { JSONObject } from '../src/lib/json-object'
import { SegmentEvent } from '../src/lib/segment-event'
import { createSegmentEvent } from './create-segment-event'

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
   * Whether or not to *skip* default mappings (only happens during testing).
   * Set to `true` if you want to explicitly provide the raw input.
   * Set to `false` or omit if you want to test that defaultMappings
   * work for any missing properties.
   */
  skipDefaultMappings?: boolean
}

class TestDestination<T> extends Destination<T> {
  responses: Response[]

  constructor(destination: DestinationDefinition<T>) {
    super(destination)
  }

  /** Testing method that runs an action e2e while allowing slightly more flexible inputs */
  async testAction(
    action: string,
    { event, mapping, settings, skipDefaultMappings }: InputData<T>
  ): Promise<Destination['responses']> {
    mapping = mapping ?? {}

    if (!skipDefaultMappings) {
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

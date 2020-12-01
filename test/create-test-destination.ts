import { Destination, DestinationDefinition } from '@/lib/destination-kit'
import { JSONObject } from '@/lib/json-object'
import { SegmentEvent } from '@/lib/segment-event'

interface InputData<Settings> {
  mapping?: JSONObject
  settings: Settings
}

class TestDestination<T> extends Destination<T> {
  constructor(destination: DestinationDefinition<T>) {
    super(destination)
  }

  /** Testing method that runs an action e2e while allowing slightly more flexible inputs */
  async testAction(action: string, data: InputData<T>, event?: SegmentEvent) {
    return super.executeAction(action, {
      payload: event || {},
      mapping: data.mapping,
      settings: data.settings,
      cachedFields: {}
    })
  }
}

export function createTestDestination<T>(destination: DestinationDefinition<T>) {
  return new TestDestination(destination)
}

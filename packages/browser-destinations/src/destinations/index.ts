import * as braze from './braze'

export const destinations = {
  '60fb01aec459242d3b6f20c1': braze.destination
}

export type ActionDestinationSlug = keyof typeof destinations

export function getDefinitionById(id: string) {
  return destinations[id as ActionDestinationSlug]
}

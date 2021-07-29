import type { BrowserDestinationDefinition } from 'src/lib/browser-destinations'
import * as amplitude from './amplitude-plugins'
import * as braze from './braze'

export const destinations: Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { definition: BrowserDestinationDefinition<any, any>; path: string }
> = {
  // TODO figure out if it's possible to colocate the Amplitude web action with the rest of its destination definition (in `./packages/destination-actions`)
  '5f7dd6d21ad74f3842b1fc47': { definition: amplitude.destination, path: require.resolve('./amplitude-plugins') },
  '60fb01aec459242d3b6f20c1': { definition: braze.destination, path: require.resolve('./braze') }
}

export type ActionDestinationSlug = keyof typeof destinations

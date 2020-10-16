import { Destination } from '../../lib/destination-kit'
import config from './destination.json'
import noop from './noop'

export default function createDestination(): Destination {
  const destination = new Destination(config).partnerAction('noop', noop)

  return destination
}

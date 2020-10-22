import { Destination } from '../../lib/destination-kit'
import noop from './noop'

export default function createDestination(): Destination<{}> {
  const destination = new Destination<{}>({
    name: 'No-op'
  })

  destination.partnerAction('noop', noop)

  return destination
}

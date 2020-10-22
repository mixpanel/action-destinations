import { Destination } from '../../lib/destination-kit'
import postToChannel from './postToChannel'

export default function createDestination(): Destination<{}> {
  const destination = new Destination<{}>({
    name: 'Slack'
  })

  destination.partnerAction('postToChannel', postToChannel)

  return destination
}

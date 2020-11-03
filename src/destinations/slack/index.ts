import { Destination } from '../../lib/destination-kit'
import { Settings } from './generated-types'
import postToChannel from './postToChannel'

export default function createDestination(): Destination<{}> {
  const destination = new Destination<Settings>({
    name: 'Slack',
    actions: {
      postToChannel
    }
  })

  return destination
}

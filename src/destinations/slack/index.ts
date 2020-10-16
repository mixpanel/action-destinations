import { Destination } from '../../lib/destination-kit'
import config from './destination.json'
import postToChannel from './postToChannel'

export default function createDestination(): Destination {
  const destination = new Destination(config).partnerAction('postToChannel', postToChannel)

  return destination
}

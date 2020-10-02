import { Destination } from '../../lib/destination-kit'
import config from './destination.json'
import postToChannel from './postToChannel'

const destination = new Destination(config).partnerAction('postToChannel', postToChannel)

export default destination

import { Destination } from '../../lib/destination-kit'
import config from './destination.json'
import noop from './noop'

const destination = new Destination(config).partnerAction('noop', noop)

export default destination

import type { DestinationDefinition } from '../../lib/destination-kit'
import type { Settings } from './generated-types'
import sendSMS from './sendSms'

const destination: DestinationDefinition<Settings> = {
  name: 'Twilio',
  authentication: {
    scheme: 'custom',
    fields: {
      accountId: {
        title: 'Account Id',
        description: 'Your Twilio Account Id',
        type: 'string',
        required: true
      },
      token: {
        title: 'Token',
        description: 'Your Twilio Token.',
        type: 'string',
        required: true
      },
      phoneNumber: {
        title: 'Phone Number',
        description: 'Your Twilio Phone Number with Country Code.',
        type: 'string',
        required: true
      }
    },
    testAuthentication: (req) => {
      return req('https://api.twilio.com/2010-04-01/Accounts')
    }
  },
  extendRequest({ settings }) {
    return {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      username: settings.accountId,
      password: settings.token
    }
  },
  actions: {
    sendSMS
  }
}

export default destination

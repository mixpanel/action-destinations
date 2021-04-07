import type { ActionDefinition } from '@segment/actions-core'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Send SMS',
  description: 'Sends an SMS message',
  defaultSubscription: 'type = "track"',
  fields: {
    To: {
      title: 'To',
      description: 'The Phone Number to send a SMS to',
      type: 'string',
      required: true
    },
    Body: {
      title: 'Body',
      description: 'The message body',
      type: 'string',
      required: true
    }
  },
  perform: (request, data) => {
    return request(`https://api.twilio.com/2010-04-01/Accounts/${data.settings.accountId}/Messages.json`, {
      method: 'POST',
      form: {
        From: data.settings.phoneNumber,
        ...data.payload
      }
    })
  }
}

export default action

import type { DestinationDefinition } from '@segment/actions-core'
import { defaultValues } from '@segment/actions-core'
import identifyUser from './identifyUser'
import logEvent from './logEvent'
import orderCompleted from './orderCompleted'
import mapUser from './mapUser'
import groupIdentifyUser from './groupIdentifyUser'
import type { Settings } from './generated-types'

/** used in the quick setup */
const presets: DestinationDefinition['presets'] = [
  {
    name: 'Track Calls',
    subscribe: 'type = "track"',
    partnerAction: 'logEvent',
    mapping: defaultValues(logEvent.fields)
  },
  {
    name: 'Page Calls',
    subscribe: 'type = "page"',
    partnerAction: 'logEvent',
    mapping: defaultValues(logEvent.fields)
  },
  {
    name: 'Screen Calls',
    subscribe: 'type = "screen"',
    partnerAction: 'logEvent',
    mapping: defaultValues(logEvent.fields)
  },
  {
    name: 'Identify Calls',
    subscribe: 'type = "identify"',
    partnerAction: 'identifyUser',
    mapping: defaultValues(identifyUser.fields)
  },
  {
    name: 'Browser Session Tracking',
    subscribe: 'type = "track" or type = "identify" or type = "group" or type = "page" or type = "alias"',
    partnerAction: 'sessionId',
    mapping: {}
  }
]

const destination: DestinationDefinition<Settings> = {
  name: 'Amplitude',
  authentication: {
    scheme: 'custom',
    fields: {
      apiKey: {
        title: 'API Key',
        description: 'Amplitude project API key. You can find this key in the "General" tab of your Amplitude project.',
        type: 'string',
        required: true
      },
      secretKey: {
        title: 'Secret Key',
        description:
          'Amplitude project secret key. You can find this key in the "General" tab of your Amplitude project.',
        type: 'string',
        required: true
      }
    },
    testAuthentication: (request, { settings }) => {
      // Note: Amplitude has some apis that use basic auth (like this one)
      // and others that use custom auth in the request body
      return request('https://amplitude.com/api/2/usersearch?user=testUser@example.com', {
        username: settings.apiKey,
        password: settings.secretKey
      })
    }
  },
  presets,
  actions: {
    logEvent,
    identifyUser,
    orderCompleted,
    mapUser,
    groupIdentifyUser
  }
}

export default destination

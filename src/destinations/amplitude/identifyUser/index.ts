import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Identify User',
  description:
    'Set the user ID for a particular device ID or update user properties without sending an event to Amplitude.',
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    defaultSubscription: 'type = "identify"',
    properties: {
      user_id: {
        title: 'User ID',
        type: 'string',
        description:
          'A UUID (unique user ID) specified by you. **Note:** If you send a request with a user ID that is not in the Amplitude system yet, then the user tied to that ID will not be marked new until their first event. Required unless device ID is present.',
        defaultMapping: {
          '@path': '$.userId'
        }
      },
      device_id: {
        title: 'Device ID',
        type: 'string',
        description:
          'A device specific identifier, such as the Identifier for Vendor (IDFV) on iOS. Required unless user ID is present.',
        defaultMapping: {
          '@path': '$.context.device.id'
        }
      },
      user_properties: {
        title: 'User Properties',
        type: 'object',
        description:
          'Additional data tied to the user in Amplitude. Each distinct value will show up as a user segment on the Amplitude dashboard. Object depth may not exceed 40 layers. **Note:** You can store property values in an array and date values are transformed into string values.',
        defaultMapping: {
          '@path': '$.traits'
        }
      },
      groups: {
        title: 'Groups',
        type: 'object',
        description:
          "Groups of users for Amplitude's account-level reporting feature. Note: You can only track up to 5 groups. Any groups past that threshold will not be tracked. **Note:** This feature is only available to Amplitude Enterprise customers who have purchased the Amplitude Accounts add-on."
      },
      app_version: {
        title: 'App Version',
        type: 'string',
        description: 'Version of the app the user is on.',
        defaultMapping: {
          '@path': '$.context.app.version'
        }
      },
      platform: {
        title: 'Platform',
        type: 'string',
        description: 'What platform is sending the data.',
        defaultMapping: {
          '@path': '$.context.device.type'
        }
      },
      os_name: {
        title: 'OS Name',
        type: 'string',
        description: 'Mobile operating system or browser the user is on.',
        defaultMapping: {
          '@path': '$.context.os.name'
        }
      },
      os_version: {
        title: 'OS Version',
        type: 'string',
        description: 'Version of the mobile operating system or browser the user is on.',
        defaultMapping: {
          '@path': '$.context.os.version'
        }
      },
      device_brand: {
        title: 'Device Brand',
        type: 'string',
        description: 'Device brand the user is on.',
        defaultMapping: {
          '@path': '$.context.device.manufacturer'
        }
      },
      device_manufacturer: {
        title: 'Device Manufacturer',
        type: 'string',
        description: 'Device manufacturer the user is on.',
        defaultMapping: {
          '@path': '$.context.device.manufacturer'
        }
      },
      device_model: {
        title: 'Device Model',
        type: 'string',
        description: 'Device model the user is on.',
        defaultMapping: {
          '@path': '$.context.device.model'
        }
      },
      carrier: {
        title: 'Carrier',
        type: 'string',
        description: 'Carrier the user has.',
        defaultMapping: {
          '@path': '$.context.network.carrier'
        }
      },
      country: {
        title: 'Country',
        type: 'string',
        description: 'Country the user is in.',
        defaultMapping: {
          '@path': '$.context.location.country'
        }
      },
      region: {
        title: 'Region',
        type: 'string',
        description: 'Geographical region the user is in.',
        defaultMapping: {
          '@path': '$.context.location.city'
        }
      },
      city: {
        title: 'City',
        type: 'string',
        description: 'What city the user is in.',
        defaultMapping: {
          '@path': '$.context.location.city'
        }
      },
      dma: {
        title: 'Designated Market Area',
        type: 'string',
        description: 'The Designated Market Area of the user.'
      },
      language: {
        title: 'Language',
        type: 'string',
        description: 'Language the user has set.',
        defaultMapping: {
          '@path': '$.context.locale'
        }
      },
      paying: {
        title: 'Is Paying',
        type: 'boolean',
        description: 'Whether the user is paying or not.'
      },
      start_version: {
        title: 'Initial Version',
        type: 'string',
        description: 'Version of the app the user was first on.'
      }
    }
  },
  perform: (request, { payload, settings }) => {
    return request.post('https://api.amplitude.com/identify', {
      form: {
        api_key: settings.apiKey,
        identification: JSON.stringify(payload)
      }
    })
  }
}

export default action

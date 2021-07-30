import type { BrowserActionDefinition } from '../../../lib/browser-destinations'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'
import appboy from '@braze/web-sdk'
import dayjs from '../../../lib/dayjs'

const known_traits = ['email', 'firstName', 'gender', 'city', 'avatar', 'lastName', 'phone']

const action: BrowserActionDefinition<Settings, typeof appboy, Payload> = {
  title: 'Log User',
  description: 'Updates a users profile attributes in Braze',
  platform: 'web',
  fields: {
    external_id: {
      label: 'External User ID',
      description: 'The unique user identifier',
      type: 'string',
      default: {
        '@path': '$.userId'
      }
    },
    country: {
      label: 'Country',
      description: 'The country code of the user',
      type: 'string',
      allowNull: true,
      default: {
        '@path': '$.context.location.country'
      }
    },
    current_location: {
      label: 'Current Location',
      description: "The user's current longitude/latitude.",
      type: 'object',
      allowNull: true,
      properties: {
        key: {
          label: 'Key',
          type: 'string',
          required: true
        },
        latitude: {
          label: 'Latitude',
          type: 'number',
          required: true
        },
        longitude: {
          label: 'Longitude',
          type: 'number',
          required: true
        }
      }
    },
    custom_attributes: {
      label: 'Custom Attributes',
      description:
        'Sets a custom user attribute. This can be any key/value pair and is used to collect extra information about the user.',
      type: 'object',
      default: {
        '@path': '$.traits'
      }
    },
    dob: {
      label: 'Date of Birth',
      description: "The user's date of birth",
      type: 'datetime',
      allowNull: true
    },
    email: {
      label: 'Email',
      description: "The user's email",
      type: 'string',
      format: 'email',
      allowNull: true,
      default: {
        '@path': '$.traits.email'
      }
    },
    email_subscribe: {
      label: 'Email Subscribe',
      description: `The user's email subscription preference: “opted_in” (explicitly registered to receive email messages), “unsubscribed” (explicitly opted out of email messages), and “subscribed” (neither opted in nor out).`,
      type: 'string'
    },
    first_name: {
      label: 'First Name',
      description: `The user's first name`,
      type: 'string',
      allowNull: true,
      default: {
        '@path': '$.traits.firstName'
      }
    },
    gender: {
      label: 'Gender',
      description:
        "The user's gender: “M”, “F”, “O” (other), “N” (not applicable), “P” (prefer not to say) or nil (unknown).",
      type: 'string',
      allowNull: true,
      default: {
        '@path': '$.traits.gender'
      }
    },
    home_city: {
      label: 'Home City',
      description: "The user's home city.",
      type: 'string',
      allowNull: true,
      default: {
        '@path': '$.traits.address.city'
      }
    },
    image_url: {
      label: 'Image URL',
      description: 'URL of image to be associated with user profile.',
      type: 'string',
      format: 'uri',
      default: {
        '@path': '$.traits.avatar'
      }
    },
    language: {
      label: 'Language',
      description: "The user's preferred language.",
      type: 'string',
      allowNull: true
    },
    last_name: {
      label: 'Last Name',
      description: "The user's last name",
      type: 'string',
      default: {
        '@path': '$.traits.lastName'
      }
    },
    phone: {
      label: 'Phone Number',
      description: "The user's phone number",
      type: 'string',
      allowNull: true,
      default: {
        '@path': '$.traits.phone'
      }
    },
    push_subscribe: {
      label: 'Push Subscribe',
      description: `The user's push subscription preference: “opted_in” (explicitly registered to receive push messages), “unsubscribed” (explicitly opted out of push messages), and “subscribed” (neither opted in nor out).`,
      type: 'string'
    }
  },

  perform: (client, { payload }) => {
    // TODO - addAlias / addToCustomAttributeArray?
    if (payload.external_id !== undefined) {
      client.changeUser(payload.external_id)
    }

    if (payload.image_url !== undefined) {
      client.getUser().setAvatarImageUrl(payload.image_url)
    }
    if (payload.country !== undefined) {
      client.getUser().setCountry(payload.country)
    }
    if (payload.current_location?.key !== undefined) {
      client
        .getUser()
        .setCustomLocationAttribute(
          payload.current_location.key,
          payload.current_location.latitude,
          payload.current_location.longitude
        )
    }
    if (payload.dob !== undefined) {
      if (payload.dob === null) {
        client.getUser().setDateOfBirth(null, null, null)
      } else {
        const date = dayjs(payload.dob)
        client.getUser().setDateOfBirth(date.year(), date.month() + 1, date.date())
      }
    }
    if (payload.custom_attributes !== undefined) {
      Object.entries(payload.custom_attributes).forEach(([key, value]) => {
        if (!known_traits.includes(key)) {
          client.getUser().setCustomUserAttribute(key, value as string | number | boolean | Date | string[] | null)
        }
      })
    }
    if (payload.email_subscribe !== undefined)
      client
        .getUser()
        .setEmailNotificationSubscriptionType(payload.email_subscribe as appboy.User.NotificationSubscriptionTypes)
    if (payload.email !== undefined) {
      client.getUser().setEmail(payload.email)
    }
    if (payload.first_name !== undefined) {
      client.getUser().setFirstName(payload.first_name)
    }
    if (payload.gender !== undefined) {
      client.getUser().setGender(payload.gender as appboy.User.Genders)
    }
    if (payload.home_city !== undefined) {
      client.getUser().setHomeCity(payload.home_city)
    }
    if (payload.language !== undefined) {
      client.getUser().setLanguage(payload.language)
    }
    if (payload.current_location !== undefined) {
      client.getUser().setLastKnownLocation(payload.current_location.latitude, payload.current_location.longitude)
    }
    if (payload.last_name !== undefined) {
      client.getUser().setLastName(payload.last_name)
    }
    if (payload.phone !== undefined) {
      client.getUser().setPhoneNumber(payload.phone)
    }
    if (payload.push_subscribe !== undefined) {
      client
        .getUser()
        .setPushNotificationSubscriptionType(payload.push_subscribe as appboy.User.NotificationSubscriptionTypes)
    }
  }
}

export default action

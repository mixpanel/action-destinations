import { IntegrationError } from '@segment/actions-core'
import type { ActionDefinition } from '@segment/actions-core'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'
import dayjs from '../../../lib/dayjs'

type DateInput = string | Date | number | null | undefined
type DateOutput = string | undefined | null

function toISO8601(date: DateInput): DateOutput {
  if (date === null || date === undefined) {
    return date
  }

  const d = dayjs(date)
  return d.isValid() ? d.toISOString() : undefined
}

function toDateFormat(date: DateInput, format: string): DateOutput {
  if (date === null || date === undefined) {
    return date
  }

  const d = dayjs(date)
  return d.isValid() ? d.format(format) : undefined
}

const action: ActionDefinition<Settings, Payload> = {
  title: 'Update User Profile',
  description: "Update a user's profile attributes in Braze",
  defaultSubscription: 'type = "identify"',
  fields: {
    external_id: {
      label: 'External User ID',
      description: 'The unique user identifier',
      type: 'string',
      default: {
        '@path': '$.userId'
      }
    },
    user_alias: {
      label: 'User Alias Object',
      description:
        'A user alias object. See [the docs](https://www.braze.com/docs/api/objects_filters/user_alias_object/).',
      type: 'object',
      properties: {
        alias_name: {
          label: 'Alias Name',
          type: 'string',
          required: true
        },
        alias_label: {
          label: 'Alias Label',
          type: 'string',
          required: true
        }
      }
    },
    braze_id: {
      label: 'Braze User Identifier',
      description: 'The unique user identifier',
      type: 'string',
      allowNull: true,
      default: {
        '@path': '$.properties.braze_id'
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
        latitude: {
          label: 'Latitude',
          type: 'number'
        },
        longitude: {
          label: 'Longitude',
          type: 'number'
        }
      }
    },
    date_of_first_session: {
      label: 'Date of First Session',
      description: 'The date the user first used the app',
      type: 'datetime',
      allowNull: true
    },
    date_of_last_session: {
      label: 'Date of Last Session',
      description: 'The date the user last used the app',
      type: 'datetime',
      allowNull: true
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
    email_open_tracking_disabled: {
      label: 'Email Open Tracking Disabled',
      description:
        'Set to true to disable the open tracking pixel from being added to all future emails sent to this user.',
      type: 'boolean'
    },
    email_click_tracking_disabled: {
      label: 'Email Click Tracking Disabled',
      description: 'Set to true to disable the click tracking for all links within a future email, sent to this user.',
      type: 'boolean'
    },
    facebook: {
      label: 'Facebook Attribution Data',
      description:
        'Hash of Facebook attribution containing any of `id` (string), `likes` (array of strings), `num_friends` (integer).',
      type: 'object',
      properties: {
        id: {
          label: 'Facebook ID',
          type: 'string'
        },
        likes: {
          label: 'Facebook Likes',
          type: 'string',
          multiple: true
        },
        num_friends: {
          label: 'Facebook Number of Friends',
          type: 'integer'
        }
      }
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
      allowNull: true,
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
    marked_email_as_spam_at: {
      label: 'Marked Email as Spam At',
      description: 'The date the user marked their email as spam.',
      type: 'datetime',
      allowNull: true
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
    // TODO implement `push_tokens`, `time_zone`, `twitter` and `custom_attributes`
  },

  perform: (request, { settings, payload }) => {
    const { braze_id, user_alias, external_id } = payload

    if (!braze_id && !user_alias && !external_id) {
      throw new IntegrationError(
        'One of "external_id" or "user_alias" or "braze_id" is required.',
        'Missing required fields',
        400
      )
    }

    return request(`${settings.endpoint}`, {
      method: 'post',
      json: {
        attributes: [
          {
            braze_id,
            external_id,
            user_alias,
            // TODO format country code according to ISO-3166-1 alpha-2 standard?
            // https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
            country: payload.country,
            current_location: payload.current_location,
            date_of_first_session: toISO8601(payload.date_of_first_session),
            date_of_last_session: toISO8601(payload.date_of_last_session),
            dob: toDateFormat(payload.dob, 'YYYY-MM-DD'),
            email: payload.email,
            email_subscribe: payload.email_subscribe,
            email_open_tracking_disabled: payload.email_open_tracking_disabled,
            email_click_tracking_disabled: payload.email_click_tracking_disabled,
            facebook: payload.facebook,
            first_name: payload.first_name,
            gender: payload.gender,
            home_city: payload.home_city,
            image_url: payload.image_url,
            // TODO format as ISO-639-1 standard ?
            // https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
            // https://www.braze.com/docs/user_guide/data_and_analytics/user_data_collection/language_codes/
            language: payload.language,
            last_name: payload.last_name,
            marked_email_as_spam_at: toISO8601(payload.marked_email_as_spam_at),
            phone: payload.phone,
            push_subscribe: payload.push_subscribe
          }
        ]
      }
    })
  }
}

export default action

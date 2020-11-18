import { ActionDefinition } from '@/lib/destination-kit/action'
import { Settings } from '../generated-types'
import { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Post Message',
  description: 'Post a message to a Slack channel.',
  schema: {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    additionalProperties: false,
    properties: {
      url: {
        title: 'Webhook URL',
        description: 'Slack webhook URL.',
        type: 'string',
        format: 'uri'
      },
      channel: {
        title: 'Channel',
        description: 'Slack channel to post message to.',
        type: 'string'
      },
      text: {
        title: 'Message',
        description:
          "The text message to post to Slack. You can use [Slack's formatting syntax.](https://api.slack.com/reference/surfaces/formatting)",
        type: 'string'
      },
      username: {
        title: 'User',
        description: 'User name to post messages as.',
        type: 'string',
        default: 'Segment'
      },
      icon_url: {
        title: 'Icon URL',
        description: 'URL for user icon image.',
        type: 'string',
        default: 'https://logo.clearbit.com/segment.com'
      }
    },
    required: ['url', 'text']
  },

  perform: (request, { payload }) => {
    return request.post(payload.url, {
      json: {
        channel: payload.channel,
        text: payload.text,
        username: payload.username,
        icon_url: payload.icon_url
      },
      responseType: 'text'
    })
  }
}

export default action

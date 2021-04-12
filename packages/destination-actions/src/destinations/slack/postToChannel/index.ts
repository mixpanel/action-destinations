import type { ActionDefinition } from '@segment/actions-core'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Post Message',
  description: 'Post a message to a Slack channel.',
  fields: {
    url: {
      title: 'Webhook URL',
      description: 'Slack webhook URL.',
      type: 'string',
      required: true,
      format: 'uri'
    },
    text: {
      title: 'Message',
      required: true,
      description:
        "The text message to post to Slack. You can use [Slack's formatting syntax.](https://api.slack.com/reference/surfaces/formatting)",
      type: 'string'
    },
    channel: {
      title: 'Channel',
      description: 'Slack channel to post message to.',
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

  perform: (request, { payload }) => {
    return request(payload.url, {
      method: 'post',
      json: {
        channel: payload.channel,
        text: payload.text,
        username: payload.username,
        icon_url: payload.icon_url
      }
    })
  }
}

export default action

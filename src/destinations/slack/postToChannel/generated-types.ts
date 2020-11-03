// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * Slack webhook URL.
 */
export type WebhookURL = string
/**
 * Slack channel to post message to.
 */
export type Channel = string
/**
 * The text message to post to Slack. You can use [Slack's formatting syntax.](https://api.slack.com/reference/surfaces/formatting)
 */
export type Message = string
/**
 * User name to post messages as.
 */
export type User = string
/**
 * URL for user icon image.
 */
export type IconURL = string

/**
 * Post a message to a Slack channel.
 */
export interface PostMessage {
  url: WebhookURL
  channel?: Channel
  text: Message
  username?: User
  icon_url?: IconURL
}

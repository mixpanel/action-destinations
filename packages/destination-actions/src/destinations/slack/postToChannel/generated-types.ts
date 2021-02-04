// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * Slack webhook URL.
 */
export type WebhookURL = string
/**
 * The text message to post to Slack. You can use [Slack's formatting syntax.](https://api.slack.com/reference/surfaces/formatting)
 */
export type Message = string
/**
 * Slack channel to post message to.
 */
export type Channel = string
/**
 * User name to post messages as.
 */
export type User = string
/**
 * URL for user icon image.
 */
export type IconURL = string

export interface Payload {
  url: WebhookURL
  text: Message
  channel?: Channel
  username?: User
  icon_url?: IconURL
}

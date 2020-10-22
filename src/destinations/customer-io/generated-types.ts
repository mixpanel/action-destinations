// Generated file. DO NOT MODIFY IT BY HAND.

/**
 * Customer.io API key. This can be found on your [API Credentials page](https://fly.customer.io/settings/api_credentials).
 */
export type APIKey = string
/**
 * Customer.io App API Key. This can be found on your [API Credentials page](https://fly.customer.io/settings/api_credentials?keyType=app).
 */
export type AppAPIKey = string
/**
 * Customer.io site ID. This can be found on your [API Credentials page](https://fly.customer.io/settings/api_credentials).
 */
export type SiteID = string

export interface Settings {
  apiKey: APIKey
  appApiKey: AppAPIKey
  siteId: SiteID
}

// Generated file. DO NOT MODIFY IT BY HAND.

export interface Payload {
  /**
   * The unique user identifier
   */
  external_id?: string
  /**
   * A user alias object. See [the docs](https://www.braze.com/docs/api/objects_filters/user_alias_object/).
   */
  user_alias?: {
    alias_name: string
    alias_label: string
  }
  /**
   * The unique user identifier
   */
  braze_id?: string | null
  /**
   * The country code of the user
   */
  country?: string | null
  /**
   * The user's current longitude/latitude.
   */
  current_location?: {
    key?: string
    latitude: number
    longitude: number
  }
  /**
   * Sets a custom user attribute. This can be any key/value pair and is used to collect extra information about the user.
   */
  custom_attributes?: object
  /**
   * The date the user first used the app
   */
  date_of_first_session?: string | number | null
  /**
   * The date the user last used the app
   */
  date_of_last_session?: string | number | null
  /**
   * The user's date of birth
   */
  dob?: string | number | null
  /**
   * The user's email
   */
  email?: string | null
  /**
   * The user's email subscription preference: “opted_in” (explicitly registered to receive email messages), “unsubscribed” (explicitly opted out of email messages), and “subscribed” (neither opted in nor out).
   */
  email_subscribe?: string
  /**
   * Set to true to disable the open tracking pixel from being added to all future emails sent to this user.
   */
  email_open_tracking_disabled?: boolean
  /**
   * Set to true to disable the click tracking for all links within a future email, sent to this user.
   */
  email_click_tracking_disabled?: boolean
  /**
   * Hash of Facebook attribution containing any of `id` (string), `likes` (array of strings), `num_friends` (integer).
   */
  facebook?: {
    id?: string
    likes?: string[]
    num_friends?: number
  }
  /**
   * The user's first name
   */
  first_name?: string | null
  /**
   * The user's gender: “M”, “F”, “O” (other), “N” (not applicable), “P” (prefer not to say) or nil (unknown).
   */
  gender?: string | null
  /**
   * The user's home city.
   */
  home_city?: string | null
  /**
   * URL of image to be associated with user profile.
   */
  image_url?: string
  /**
   * The user's preferred language.
   */
  language?: string | null
  /**
   * The user's last name
   */
  last_name?: string
  /**
   * The date the user marked their email as spam.
   */
  marked_email_as_spam_at?: string | number | null
  /**
   * The user's phone number
   */
  phone?: string | null
  /**
   * The user's push subscription preference: “opted_in” (explicitly registered to receive push messages), “unsubscribed” (explicitly opted out of push messages), and “subscribed” (neither opted in nor out).
   */
  push_subscribe?: string
}
